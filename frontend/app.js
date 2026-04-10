import { calculate, convert, resetCalculator } from "./api_client.js";
import { buildKeypadLayout } from "./keypad_layout.js";
import { renderCalculator } from "./canvas_renderer.js";
import { canvasPoint, isFractionText } from "./utils.js";

const DEFAULT_MEMORY = { M1: "", M2: "", M3: "", M4: "", M5: "" };
const MODE_SEQUENCE = ["DEG", "RAD", "GRD"];

function shouldIgnoreGlobalKeydown(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

class CalculatorUI {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.clockTimer = null;
    this.state = {
      expression: "",
      answer: "",
      mode: "DEG",
      clockMode: "24H",
      clockText: "",
      useFractions: false,
      hoveredButton: null,
      pressedButton: null,
      isError: false,
      memory: { ...DEFAULT_MEMORY },
    };
    this.layout = buildKeypadLayout(canvas.width, canvas.height);
    this._bindEvents();
    this._syncState();
    this._startClock();
    this.render();
  }

  _bindEvents() {
    window.addEventListener("resize", () => this.resize());
    this.canvas.addEventListener("mousemove", (event) => this.onMove(event));
    this.canvas.addEventListener("mouseleave", () => {
      if (this.state.hoveredButton !== null) {
        this.state.hoveredButton = null;
        this.render();
      }
    });
    this.canvas.addEventListener("mousedown", (event) => this.onDown(event));
    this.canvas.addEventListener("mouseup", (event) => this.onUp(event));
    this.canvas.addEventListener("click", (event) => this.onClick(event));
    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("beforeunload", () => this._stopClock());
  }

  _startClock() {
    this._updateClock();
    if (this.clockTimer) {
      window.clearInterval(this.clockTimer);
    }
    this.clockTimer = window.setInterval(() => this._updateClock(), 1000);
  }

  _stopClock() {
    if (this.clockTimer) {
      window.clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  }

  _updateClock() {
    this.state.clockText = formatClock(new Date(), this.state.clockMode);
    this.render();
  }

  async _syncState() {
    try {
      const response = await fetch("/state", { credentials: "same-origin" });
      const data = await response.json();
      if (data?.ok) {
        this.state.expression = data.expression || "";
        this.state.answer = data.answer || "";
        this.state.mode = MODE_SEQUENCE.includes(String(data.mode || "").toUpperCase())
          ? String(data.mode).toUpperCase()
          : "DEG";
        this.state.memory = { ...DEFAULT_MEMORY, ...(data.memory || {}) };
        this.state.useFractions = isFractionText(this.state.answer);
        this.render();
        return;
      }
    } catch {
      // fall through
    }

    await this._syncMemoryPreview();
  }

  async _syncMemoryPreview() {
    try {
      const response = await fetch("/memory/recall", { credentials: "same-origin" });
      const data = await response.json();
      if (data?.ok && data.memory) {
        this.state.memory = { ...this.state.memory, ...data.memory };
        this.render();
      }
    } catch {
      // keep usable
    }
  }

  resize() {
    const parent = this.canvas.parentElement;
    const width = Math.max(360, Math.min(parent.clientWidth, 560));
    const height = Math.max(760, Math.min(Math.round(width * 1.54), window.innerHeight - 32));
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.layout = buildKeypadLayout(width, height);
    this.render();
  }

  render() {
    renderCalculator(this.ctx, this.state, this.layout);
  }

  pointInRect(point, rect) {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.w &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.h
    );
  }

  buttonAt(point) {
    const hotspot = (this.layout.hotspots || []).find((item) => this.pointInRect(point, item));
    if (hotspot) {
      return hotspot;
    }

    return this.layout.buttons.find((button) => this.pointInRect(point, button)) || null;
  }

  onMove(event) {
    const point = canvasPoint(event, this.canvas);
    const button = this.buttonAt(point);
    const nextHovered = button ? button.action : null;

    if (this.state.hoveredButton !== nextHovered) {
      this.state.hoveredButton = nextHovered;
      this.render();
    }
  }

  onDown(event) {
    const point = canvasPoint(event, this.canvas);
    const button = this.buttonAt(point);
    const nextPressed = button ? button.action : null;

    if (this.state.pressedButton !== nextPressed) {
      this.state.pressedButton = nextPressed;
      this.render();
    } else if (nextPressed === null) {
      this.state.pressedButton = null;
    }
  }

  async onUp(event) {
    const point = canvasPoint(event, this.canvas);
    const button = this.buttonAt(point);
    const nextPressed = button ? button.action : null;

    if (this.state.pressedButton !== null) {
      this.state.pressedButton = null;
      this.render();
    }

    if (button && nextPressed !== null) {
      await this.handleAction(button.action);
    }
  }

  async onClick(event) {
    const point = canvasPoint(event, this.canvas);
    const button = this.buttonAt(point);
    if (button?.action === "toggle-clock") {
      await this.handleAction("toggle-clock");
    }
  }

  async onKeyDown(event) {
    if (shouldIgnoreGlobalKeydown(event)) {
      return;
    }

    const key = event.key;

    if (key >= "0" && key <= "9") {
      event.preventDefault();
      return this.appendToken(key);
    }

    if (["+", "-", "*", "/", ".", "(", ")", "^"].includes(key)) {
      event.preventDefault();
      return this.appendToken(key);
    }

    if (key === "Enter" || key === "=") {
      event.preventDefault();
      return this.evaluate();
    }

    if (key === "Backspace") {
      event.preventDefault();
      return this.deleteToken();
    }

    if (key === "Escape") {
      event.preventDefault();
      return this.clearEntry();
    }

    if (key.toLowerCase() === "f") {
      event.preventDefault();
      return this.toggleFractionDisplay();
    }

    if (key.toLowerCase() === "m") {
      event.preventDefault();
      return this.toggleMode();
    }

    if (key.toLowerCase() === "s") {
      event.preventDefault();
      return this.toggleStandardDisplay();
    }
  }

  async handleAction(action) {
    if (!action) return;

    if (action.startsWith("append:")) {
      return this.appendToken(action.slice("append:".length));
    }

    switch (action) {
      case "equals":
        return this.evaluate();
      case "delete":
        return this.deleteToken();
      case "clear-entry":
        return this.clearEntry();
      case "reset":
        return this.resetAll();
      case "toggle-fraction":
        return this.toggleFractionDisplay();
      case "toggle-standard":
        return this.toggleStandardDisplay();
      case "toggle-mode":
        return this.toggleMode();
      case "toggle-clock":
        return this.toggleClockMode();
      default:
        return;
    }
  }

  appendToken(token) {
    this.state.isError = false;
    this.state.expression = smartAppend(this.state.expression, token);
    this.render();
  }

  deleteToken() {
    const expr = this.state.expression || "";
    if (!expr) return;

    const tokens = tokenizeExpression(expr);
    tokens.pop();
    this.state.expression = tokens.join("");
    this.render();
  }

  clearEntry() {
    this.state.expression = "";
    this.state.answer = "";
    this.state.isError = false;
    this.render();
  }

  async evaluate() {
    try {
      const response = await calculate({
        expr: this.state.expression,
        mode: this.state.mode,
        precision: 10,
        useFractions: this.state.useFractions,
      });

      this.state.isError = !response.ok;
      this.state.answer = response.display || response.result || "";
      if (response.ok) {
        this.state.useFractions = isFractionText(response.result);
      }
      this.render();
    } catch {
      this.state.isError = true;
      this.state.answer = "SYSTEM ERROR";
      this.render();
    }
  }

  async toggleFractionDisplay() {
    if (!this.state.answer) return;

    const source = isFractionText(this.state.answer) ? "fraction" : "decimal";
    const target = source === "fraction" ? "decimal" : "fraction";

    try {
      const response = await convert({
        value: this.state.answer,
        from: source,
        to: target,
      });

      if (response.ok) {
        this.state.answer = response.display;
        this.state.useFractions = target === "fraction";
        this.state.isError = false;
      } else {
        this.state.answer = response.display || "Syntax ERROR";
        this.state.isError = true;
      }

      this.render();
    } catch {
      this.state.answer = "SYSTEM ERROR";
      this.state.isError = true;
      this.render();
    }
  }

  async toggleStandardDisplay() {
    if (!this.state.answer) return;

    const cleanAnswer = String(this.state.answer).replace(/,/g, "");
    const source = isScientificNotationText(cleanAnswer) ? "standard" : "decimal";
    const target = source === "standard" ? "decimal" : "standard";

    try {
      const response = await convert({
        value: cleanAnswer,
        from: source,
        to: target,
      });

      if (response.ok) {
        this.state.answer = response.display;
        this.state.isError = false;
      } else {
        this.state.answer = response.display || "Math ERROR";
        this.state.isError = true;
      }

      this.render();
    } catch {
      this.state.answer = "SYSTEM ERROR";
      this.state.isError = true;
      this.render();
    }
  }

  async toggleMode() {
    const current = String(this.state.mode || "DEG").toUpperCase();
    const index = MODE_SEQUENCE.indexOf(current);
    this.state.mode = MODE_SEQUENCE[(index + 1) % MODE_SEQUENCE.length] || "DEG";
    this.render();
  }

  async toggleClockMode() {
    this.state.clockMode = this.state.clockMode === "24H" ? "12H" : "24H";
    this._updateClock();
  }

  async resetAll() {
    try {
      const response = await resetCalculator();
      if (response.ok) {
        this.state.expression = response.expression || "";
        this.state.answer = response.answer || "";
        this.state.memory = response.memory || { ...DEFAULT_MEMORY };
        this.state.mode = response.mode || "DEG";
        this.state.useFractions = false;
        this.state.isError = false;
      }
      this.render();
    } catch {
      this.state.answer = "SYSTEM ERROR";
      this.state.isError = true;
      this.render();
    }
  }
}

function formatClock(date, mode) {
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  if (mode === "12H") {
    const suffix = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    return `${String(hours12).padStart(2, "0")}:${minutes}:${seconds} ${suffix}`;
  }

  return `${String(hours24).padStart(2, "0")}:${minutes}:${seconds}`;
}

function smartAppend(expression, token) {
  const current = expression || "";
  if (!token) return current;

  if (!current) return token;

  const insertMultiply = /[0-9)]$/.test(current) && /^[A-Za-z(]/.test(token);

  if (insertMultiply) {
    return `${current}×${token}`;
  }

  return current + token;
}

function tokenizeExpression(expr) {
  const tokens = [];
  const multiTokens = ["^(-1)", "asin(", "acos(", "atan(", "sin(", "cos(", "tan(", "sqrt(", "cbrt(", "log(", "**"];

  let i = 0;
  while (i < expr.length) {
    const rest = expr.slice(i);
    const token = multiTokens.find((name) => rest.startsWith(name));
    if (token) {
      tokens.push(token);
      i += token.length;
      continue;
    }

    const ch = expr[i];
    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < expr.length && /[0-9.]/.test(expr[j])) {
        j += 1;
      }
      tokens.push(expr.slice(i, j));
      i = j;
      continue;
    }

    tokens.push(ch);
    i += 1;
  }

  return tokens;
}

function isScientificNotationText(value) {
  return typeof value === "string" && /^[+-]?\d+(\.\d+)?e[+-]?\d+$/i.test(value.replace(/,/g, "").trim());
}

function boot() {
  const canvas = document.getElementById("calcCanvas");
  if (!canvas) {
    return;
  }
  const ui = new CalculatorUI(canvas);
  ui.resize();
}

window.addEventListener("DOMContentLoaded", boot);