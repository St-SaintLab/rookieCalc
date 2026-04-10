function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function hexToRgb(hex) {
  const raw = hex.replace("#", "");
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function mixColor(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const lerp = (x, y) => Math.round(x + (y - x) * t);
  return `rgb(${lerp(ca.r, cb.r)}, ${lerp(ca.g, cb.g)}, ${lerp(ca.b, cb.b)})`;
}

function drawTextFit(ctx, text, x, y, maxWidth, options = {}) {
  const {
    align = "left",
    baseline = "middle",
    color = "#111111",
    minSize = 11,
    maxSize = 30,
    weight = "700",
    family = "system-ui, sans-serif",
    truncateFromLeft = false,
  } = options;

  const content = String(text ?? "");
  let size = maxSize;
  let renderText = content;

  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = color;

  while (size >= minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(renderText).width <= maxWidth) {
      break;
    }
    size -= 1;
  }

  ctx.font = `${weight} ${size}px ${family}`;
  if (ctx.measureText(renderText).width > maxWidth && renderText.length > 1) {
    while (renderText.length > 1 && ctx.measureText(renderText).width > maxWidth) {
      renderText = truncateFromLeft ? `…${renderText.slice(1)}` : `${renderText.slice(0, -1)}`;
      if (truncateFromLeft && renderText.length > 2) {
        renderText = `…${renderText.slice(1)}`;
      }
    }
    if (!truncateFromLeft && renderText !== content && renderText.length > 1) {
      renderText = `${renderText.slice(0, -1)}…`;
    }
  }

  ctx.fillText(renderText, x, y);
  ctx.restore();
}

function buttonPalette(button, state) {
  const hovered = state.hoveredButton === button.action;
  const pressed = state.pressedButton === button.action;

  let top = "#4a5059";
  let bottom = "#2d3238";
  let text = "#f2f2f2";
  let stroke = "#16181c";
  let shadow = "rgba(0, 0, 0, 0.38)";

  if (button.kind === "num") {
    top = "#9d917d";
    bottom = "#746858";
    text = "#f8f3ea";
    stroke = "#473d32";
  } else if (button.kind === "op") {
    top = "#676d76";
    bottom = "#424851";
    text = "#f1f4f7";
    stroke = "#22262b";
  } else if (button.kind === "func") {
    top = "#3b4047";
    bottom = "#23272d";
    text = "#efe8d7";
    stroke = "#171a1d";
  } else if (button.kind === "special") {
    top = "#52606a";
    bottom = "#313b42";
    text = "#f1f8fb";
    stroke = "#1d262b";
  } else if (button.kind === "danger") {
    top = "#ff9a32";
    bottom = "#d16300";
    text = "#ffffff";
    stroke = "#8f4600";
  } else if (button.kind === "equals") {
    top = "#a79b8f";
    bottom = "#74695f";
    text = "#ffffff";
    stroke = "#4b4037";
  }

  if (hovered) {
    top = mixColor(top, "#ffffff", 0.08);
    bottom = mixColor(bottom, "#ffffff", 0.05);
  }
  if (pressed) {
    top = mixColor(top, "#000000", 0.05);
    bottom = mixColor(bottom, "#000000", 0.12);
  }

  return { top, bottom, text, stroke, shadow };
}

function drawRaisedButton(ctx, button, state) {
  const { top, bottom, text, stroke, shadow } = buttonPalette(button, state);

  ctx.save();
  ctx.shadowColor = shadow;
  ctx.shadowBlur = button.kind === "danger" ? 10 : 8;
  ctx.shadowOffsetY = 3;

  const gradient = ctx.createLinearGradient(0, button.y, 0, button.y + button.h);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);

  roundRect(ctx, button.x, button.y, button.w, button.h, 12);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(button.x + 8, button.y + 7);
  ctx.lineTo(button.x + button.w - 8, button.y + 7);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const label = button.label;
  const isTiny = label.length <= 2;
  const isMedium = label.length === 3;
  const maxSize = button.kind === "func" || button.kind === "special" ? 13 : isTiny ? 18 : isMedium ? 16 : 13;
  const minSize = button.kind === "func" || button.kind === "special" ? 10 : 11;

  drawTextFit(ctx, label, button.x + button.w / 2, button.y + button.h / 2 + 1, button.w - 14, {
    align: "center",
    color: text,
    minSize,
    maxSize,
    weight: "700",
    family: "system-ui, sans-serif",
  });

  ctx.restore();
}

function drawClockPanel(ctx, board, state) {
  const panelW = Math.min(188, board.w - 160);
  const panelH = 46;
  const panelX = board.x + board.w - panelW - 22;
  const panelY = board.y + 22;

  ctx.save();
  const grad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  grad.addColorStop(0, "#29161a");
  grad.addColorStop(0.5, "#1a1215");
  grad.addColorStop(1, "#0f0d10");

  roundRect(ctx, panelX, panelY, panelW, panelH, 12);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  ctx.fillStyle = "rgba(72, 255, 162, 0.05)";
  roundRect(ctx, panelX + 4, panelY + 4, panelW - 8, panelH - 8, 9);
  ctx.fill();

  ctx.fillStyle = "#d9e2d8";
  ctx.font = "700 13px system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("CLOCK", panelX + 10, panelY + 6);

  ctx.fillStyle = "#7dff9e";
  ctx.font = "700 20px 'Courier New', monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  ctx.fillText(String(state.clockText || "00:00:00"), panelX + panelW - 10, panelY + 26);

  ctx.fillStyle = "#b7c5bb";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(String(state.clockMode || "24H"), panelX + panelW - 10, panelY + 6);

  ctx.restore();
}

function drawBody(ctx, board) {
  const { x, y, w, h } = board;
  ctx.save();

  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h);
  bodyGrad.addColorStop(0, "#2a2728");
  bodyGrad.addColorStop(0.23, "#19181a");
  bodyGrad.addColorStop(0.75, "#171518");
  bodyGrad.addColorStop(1, "#101012");

  ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, x, y, w, h, 30);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#3c3638";
  ctx.stroke();

  const highlightGrad = ctx.createLinearGradient(x, y, x, y + 120);
  highlightGrad.addColorStop(0, "rgba(255,255,255,0.14)");
  highlightGrad.addColorStop(0.5, "rgba(255,255,255,0.04)");
  highlightGrad.addColorStop(1, "rgba(255,255,255,0.00)");
  roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 26);
  ctx.strokeStyle = highlightGrad;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawBranding(ctx, board) {
  const left = board.x + 42;
  const top = board.y + 33;

  ctx.save();
  ctx.fillStyle = "#ca0909";
  ctx.font = "900 30px 'Bradley Hand', cursive";
  ctx.textBaseline = "middle";
  ctx.fillText("Enigma",left, top);

  ctx.fillStyle = "#d7d7d7";
  ctx.font = "100 5px system-ui, sans-serif";
  ctx.fillText("Calculator", left + 2, top + 26);
  ctx.restore();
}

function formatDisplayExpression(expression) {
  const text = String(expression || "0");
  return text.replace(/\d{4,}(?:\.\d+)?/g, (match) => {
    if (match.includes(".")) {
      const [intPart, fracPart] = match.split(".");
      return `${groupDigits(intPart)}.${fracPart}`;
    }
    return groupDigits(match);
  });
}

function groupDigits(text) {
  const raw = String(text);
  if (raw.length <= 3) return raw;
  if (!/^\d+$/.test(raw)) return raw;

  const parts = [];
  let working = raw;
  while (working.length > 3) {
    parts.unshift(working.slice(-3));
    working = working.slice(0, -3);
  }
  if (working) parts.unshift(working);
  return parts.join(",");
}

function drawLcd(ctx, display, state) {
  const { x, y, w, h } = display;

  ctx.save();

  const frameGrad = ctx.createLinearGradient(x, y, x, y + h);
  frameGrad.addColorStop(0, "#79756d");
  frameGrad.addColorStop(1, "#48443f");
  roundRect(ctx, x, y, w, h, 18);
  ctx.fillStyle = frameGrad;
  ctx.fill();

  const inset = 6;
  const screenX = x + inset;
  const screenY = y + inset;
  const screenW = w - inset * 2;
  const screenH = h - inset * 2;

  const lcdGrad = ctx.createLinearGradient(screenX, screenY, screenX, screenY + screenH);
  lcdGrad.addColorStop(0, "#b9cfbe");
  lcdGrad.addColorStop(1, "#a8c0b1");

  roundRect(ctx, screenX, screenY, screenW, screenH, 12);
  ctx.fillStyle = lcdGrad;
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 18; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#6f8d7c";
    ctx.fillRect(screenX + 8, screenY + 10 + i * 7, screenW - 16, 1);
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(33, 43, 36, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#22323a";
  ctx.globalAlpha = 0.55;
  ctx.fillRect(screenX + 4, screenY + 4, screenW - 8, 1);
  ctx.restore();

  const mode = String(state.mode || "DEG").toUpperCase();
  drawTextFit(ctx, mode, x + w - 18, y + 18, 70, {
    align: "right",
    color: "#16384a",
    minSize: 11,
    maxSize: 13,
    weight: "700",
    family: "system-ui, sans-serif",
  });

  const expression = formatDisplayExpression(state.expression || "0");
  drawTextFit(ctx, expression, screenX + 14, screenY + 46, screenW - 28, {
    align: "left",
    color: "#2b4f58",
    minSize: 14,
    maxSize: 26,
    weight: "700",
    family: "'Courier New', monospace",
  });

  const answer = String(state.answer || "0");
  const answerColor = state.isError ? "#8f1d1d" : "#173a4a";
  drawTextFit(ctx, answer, screenX + screenW - 12, screenY + screenH - 18, screenW - 24, {
    align: "right",
    color: answerColor,
    minSize: 14,
    maxSize: 30,
    weight: "700",
    family: "'Courier New', monospace",
    truncateFromLeft: true,
  });
}

function drawClockHotspotHint(ctx, layout) {
  const hotspot = (layout.hotspots || []).find((item) => item.action === "toggle-clock");
  if (!hotspot) return;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.00)";
  roundRect(ctx, hotspot.x, hotspot.y, hotspot.w, hotspot.h, 9);
  ctx.fill();
  ctx.restore();
}

export function renderCalculator(ctx, state, layout) {
  const { board, buttons } = layout;
  const canvas = ctx.canvas;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  drawBody(ctx, board);
  drawClockPanel(ctx, board, state);
  drawBranding(ctx, board);
  drawLcd(ctx, layout.display, state);
  drawClockHotspotHint(ctx, layout);

  buttons.forEach((button) => drawRaisedButton(ctx, button, state));
}