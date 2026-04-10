import { convert } from "./api_client.js";
import { CONVERTER_CATEGORIES } from "./converter_catalog.js";

const DEFAULT_CATEGORY_ID = CONVERTER_CATEGORIES[0]?.id ?? "length";
const DEFAULT_PRECISION = 10;

function getCategory(categoryId) {
  return CONVERTER_CATEGORIES.find((category) => category.id === categoryId) ?? CONVERTER_CATEGORIES[0];
}

function firstTwoUnits(categoryId) {
  const units = getCategory(categoryId)?.units ?? [];
  return [units[0]?.id ?? "", units[1]?.id ?? units[0]?.id ?? ""];
}

function setOptions(select, options, selectedValue) {
  select.innerHTML = "";
  for (const option of options) {
    const el = document.createElement("option");
    el.value = option.id;
    el.textContent = option.label;
    if (option.id === selectedValue) {
      el.selected = true;
    }
    select.appendChild(el);
  }
}

function sanitizeNumericText(text) {
  return String(text ?? "").replace(/,/g, "").trim();
}

export class ConverterUI {
  constructor(root) {
    this.root = root;
    this.elements = {
      category: root.querySelector("#converterCategory"),
      value: root.querySelector("#converterValue"),
      source: root.querySelector("#converterSource"),
      target: root.querySelector("#converterTarget"),
      swap: root.querySelector("#converterSwap"),
      convert: root.querySelector("#converterConvert"),
      result: root.querySelector("#converterResult"),
      status: root.querySelector("#converterStatus"),
    };

    this.pendingTimer = null;
    this.requestId = 0;
    this.state = {
      categoryId: DEFAULT_CATEGORY_ID,
      sourceUnit: "",
      targetUnit: "",
      precision: DEFAULT_PRECISION,
    };

    this._populateCategories();
    const [sourceUnit, targetUnit] = firstTwoUnits(this.state.categoryId);
    this.state.sourceUnit = sourceUnit;
    this.state.targetUnit = targetUnit;

    this._bindEvents();
    this._populateUnits();
    this.elements.value.value = "0";
    this._scheduleConvert();
  }

  _bindEvents() {
    this.elements.category.addEventListener("change", () => {
      this.state.categoryId = this.elements.category.value;
      const [sourceUnit, targetUnit] = firstTwoUnits(this.state.categoryId);
      this.state.sourceUnit = sourceUnit;
      this.state.targetUnit = targetUnit;
      this._populateUnits();
      this._scheduleConvert(true);
    });

    this.elements.source.addEventListener("change", () => {
      this.state.sourceUnit = this.elements.source.value;
      this._scheduleConvert(true);
    });

    this.elements.target.addEventListener("change", () => {
      this.state.targetUnit = this.elements.target.value;
      this._scheduleConvert(true);
    });

    this.elements.value.addEventListener("input", () => {
      this._scheduleConvert();
    });

    this.elements.value.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.convertNow();
      }
    });

    this.elements.swap.addEventListener("click", () => {
      const currentSource = this.elements.source.value;
      this.elements.source.value = this.elements.target.value;
      this.elements.target.value = currentSource;
      this.state.sourceUnit = this.elements.source.value;
      this.state.targetUnit = this.elements.target.value;
      this._scheduleConvert(true);
    });

    this.elements.convert.addEventListener("click", () => {
      this.convertNow();
    });
  }

  _populateCategories() {
    setOptions(
      this.elements.category,
      CONVERTER_CATEGORIES.map((category) => ({ id: category.id, label: category.label })),
      this.state.categoryId
    );
  }

  _populateUnits() {
    const category = getCategory(this.state.categoryId);
    if (!category) return;

    setOptions(this.elements.source, category.units, this.state.sourceUnit);
    setOptions(this.elements.target, category.units, this.state.targetUnit);

    if (!category.units.some((unit) => unit.id === this.elements.source.value)) {
      this.elements.source.value = category.units[0]?.id ?? "";
    }
    if (!category.units.some((unit) => unit.id === this.elements.target.value)) {
      this.elements.target.value = category.units[1]?.id ?? category.units[0]?.id ?? "";
    }

    this.state.sourceUnit = this.elements.source.value;
    this.state.targetUnit = this.elements.target.value;
  }

  _scheduleConvert(force = false) {
    this.elements.status.textContent = force ? "Updating…" : "Auto-converts as you type.";
    clearTimeout(this.pendingTimer);
    this.pendingTimer = window.setTimeout(() => this.convertNow(), force ? 0 : 160);
  }

  async convertNow() {
    const value = sanitizeNumericText(this.elements.value.value);
    const categoryId = this.elements.category.value;
    const source = this.elements.source.value;
    const target = this.elements.target.value;
    const requestId = ++this.requestId;

    if (!value) {
      this.elements.result.textContent = "—";
      this.elements.status.textContent = "Enter a value to convert.";
      return;
    }

    this.elements.status.textContent = "Converting…";

    try {
      const response = await convert({
        value,
        from: source,
        to: target,
        category: categoryId,
        precision: this.state.precision,
      });

      if (requestId !== this.requestId) return;

      if (response.ok) {
        this.elements.result.textContent = response.display || response.result || "—";
        this.elements.status.textContent = `${getCategory(categoryId)?.label ?? "Conversion"} ready.`;
      } else {
        this.elements.result.textContent = response.display || "Syntax ERROR";
        this.elements.status.textContent = response.error || "Conversion failed.";
      }
    } catch {
      if (requestId !== this.requestId) return;
      this.elements.result.textContent = "SYSTEM ERROR";
      this.elements.status.textContent = "Network or server error.";
    }
  }
}