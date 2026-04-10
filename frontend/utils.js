export function formatNumber(value, precision = 10, engineering = false) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^[+-]?\d+\/\d+$/.test(trimmed)) return trimmed;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      value = numeric;
    } else {
      return trimmed;
    }
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "Math ERROR";
  }

  if (Object.is(numeric, -0)) return "0";
  if (Number.isInteger(numeric)) return String(numeric);

  if (engineering) {
    const sign = numeric < 0 ? "-" : "";
    let abs = Math.abs(numeric);
    let exponent = 0;
    if (abs !== 0) {
      exponent = Math.floor(Math.log10(abs));
      exponent = exponent - (exponent % 3);
      abs = abs / Math.pow(10, exponent);
    }
    return `${sign}${cleanupNumeric(abs.toPrecision(precision))}e${exponent}`;
  }

  return cleanupNumeric(numeric.toPrecision(precision));
}

export function cleanupNumeric(text) {
  if (typeof text !== "string") {
    text = String(text);
  }
  if (text.includes("e") || text.includes("E")) {
    const [mantissa, exponent] = text.split(/[eE]/);
    const cleanedMantissa = mantissa.replace(/\.?0+$/, "");
    return `${cleanedMantissa}e${parseInt(exponent, 10)}`;
  }
  return text.replace(/\.?0+$/, "");
}

export function isFractionText(value) {
  return typeof value === "string" && /^\s*[+-]?\d+\/\d+\s*$/.test(value);
}

export function safeJoinExpression(expr, token) {
  const current = expr || "";
  if (!token) return current;
  if (!current) return token;
  const last = current.slice(-1);
  if (/[0-9A-Za-z)]$/.test(last) && /^[0-9A-Za-z(]/.test(token)) {
    return `${current}*${token}`;
  }
  return current + token;
}

export function canvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}
