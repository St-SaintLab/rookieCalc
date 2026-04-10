export const KEYPAD_LAYOUT = {
  margin: 20,
  displayHeight: 158,
  columns: 6,
  buttonGap: 10,
  rows: [
    [
      { label: "sin", action: "append:sin(", kind: "func" },
      { label: "cos", action: "append:cos(", kind: "func" },
      { label: "tan", action: "append:tan(", kind: "func" },
      { label: "sin^-1", action: "append:asin(", kind: "func" },
      { label: "cos^-1", action: "append:acos(", kind: "func" },
      { label: "tan^-1", action: "append:atan(", kind: "func" },
    ],
    [
      { label: "√", action: "append:sqrt(", kind: "func" },
      { label: "∛", action: "append:cbrt(", kind: "func" },
      { label: "(", action: "append:(", kind: "op" },
      { label: ")", action: "append:)", kind: "op" },
      { label: "F ↔ D", action: "toggle-fraction", kind: "special" },
      { label: "DEL", action: "delete", kind: "danger" },
    ],
    [
      { label: "7", action: "append:7", kind: "num" },
      { label: "8", action: "append:8", kind: "num" },
      { label: "9", action: "append:9", kind: "num" },
      { label: "÷", action: "append:÷", kind: "op" },
      { label: "AC", action: "clear-entry", kind: "danger" },
      { label: "RESET", action: "reset", kind: "danger" },
    ],
    [
      { label: "4", action: "append:4", kind: "num" },
      { label: "5", action: "append:5", kind: "num" },
      { label: "6", action: "append:6", kind: "num" },
      { label: "×", action: "append:×", kind: "op" },
      { label: "x^-1", action: "append:^(-1)", kind: "func" },
      null,
    ],
    [
      { label: "1", action: "append:1", kind: "num" },
      { label: "2", action: "append:2", kind: "num" },
      { label: "3", action: "append:3", kind: "num" },
      { label: "-", action: "append:-", kind: "op" },
      { label: "x^n", action: "append:^", kind: "func" },
      { label: "=", action: "equals", kind: "equals", spanY: 2 },
    ],
    [
      { label: "0", action: "append:0", kind: "num" },
      { label: ".", action: "append:.", kind: "num" },
      { label: "+", action: "append:+", kind: "op" },
      { label: "log", action: "append:log(", kind: "func" },
      { label: "S ↔ D", action: "toggle-standard", kind: "special" },
      null,
    ],
  ],
};

export function buildKeypadLayout(width, height) {
  const margin = KEYPAD_LAYOUT.margin;
  const displayHeight = KEYPAD_LAYOUT.displayHeight;
  const columns = KEYPAD_LAYOUT.columns;
  const buttonGap = KEYPAD_LAYOUT.buttonGap;

  const boardX = margin;
  const boardY = margin;
  const boardW = width - margin * 2;
  const boardH = height - margin * 2;

  const displayX = boardX + 20;
  const displayY = boardY + 86;
  const displayW = boardW - 40;
  const displayH = displayHeight;

  const keypadTop = displayY + displayH + 18;
  const keypadBottom = boardY + boardH - 18;
  const keypadHeight = keypadBottom - keypadTop;
  const rowCount = KEYPAD_LAYOUT.rows.length;
  const rowHeight = (keypadHeight - buttonGap * (rowCount - 1)) / rowCount;
  const colWidth = (boardW - 40 - buttonGap * (columns - 1)) / columns;

  const buttons = [];
  const occupied = Array.from({ length: rowCount }, () => Array(columns).fill(false));

  KEYPAD_LAYOUT.rows.forEach((row, rowIndex) => {
    row.forEach((button, colIndex) => {
      if (!button || occupied[rowIndex][colIndex]) {
        return;
      }

      const spanX = button.spanX || 1;
      const spanY = button.spanY || 1;

      for (let r = rowIndex; r < Math.min(rowCount, rowIndex + spanY); r += 1) {
        for (let c = colIndex; c < Math.min(columns, colIndex + spanX); c += 1) {
          occupied[r][c] = true;
        }
      }

      const x = boardX + 20 + colIndex * (colWidth + buttonGap);
      const y = keypadTop + rowIndex * (rowHeight + buttonGap);
      const w = spanX * colWidth + (spanX - 1) * buttonGap;
      const h = spanY * rowHeight + (spanY - 1) * buttonGap;

      buttons.push({
        ...button,
        x,
        y,
        w,
        h,
      });
    });
  });

  return {
    board: { x: boardX, y: boardY, w: boardW, h: boardH },
    display: { x: displayX, y: displayY, w: displayW, h: displayH },
    hotspots: [
      {
        action: "toggle-clock",
        x: boardX + boardW - 210,
        y: boardY + 22,
        w: 188,
        h: 46,
      },
    ],
    buttons,
  };
}
