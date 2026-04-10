function resizeCanvas(canvas, ctx) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.floor(window.innerWidth);
  const height = Math.floor(window.innerHeight);

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { width, height, dpr };
}

function hash2(x, y) {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  n = (n ^ (n >> 16)) >>> 0;
  return n / 4294967295;
}

function drawLine(ctx, x1, y1, x2, y2, stroke, alpha, width = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawCube(ctx, x, y, size, depth, stroke, alpha, wobble = 0) {
  const ox = depth * 0.72;
  const oy = -depth * 0.45;

  const sway = Math.sin(wobble) * 1.2;
  const lift = Math.cos(wobble * 0.9) * 0.9;

  const x0 = x + sway;
  const y0 = y + lift;

  const A = { x: x0, y: y0 };
  const B = { x: x0 + size, y: y0 };
  const C = { x: x0 + size, y: y0 + size };
  const D = { x: x0, y: y0 + size };

  const E = { x: A.x + ox, y: A.y + oy };
  const F = { x: B.x + ox, y: B.y + oy };
  const G = { x: C.x + ox, y: C.y + oy };
  const H = { x: D.x + ox, y: D.y + oy };

  const soft = Math.max(0.03, alpha * 0.28);
  drawLine(ctx, E.x, E.y, F.x, F.y, stroke, soft, 1);
  drawLine(ctx, F.x, F.y, G.x, G.y, stroke, soft, 1);
  drawLine(ctx, G.x, G.y, H.x, H.y, stroke, soft, 1);
  drawLine(ctx, H.x, H.y, E.x, E.y, stroke, soft, 1);

  drawLine(ctx, A.x, A.y, B.x, B.y, stroke, alpha, 1.2);
  drawLine(ctx, B.x, B.y, C.x, C.y, stroke, alpha, 1.2);
  drawLine(ctx, C.x, C.y, D.x, D.y, stroke, alpha, 1.2);
  drawLine(ctx, D.x, D.y, A.x, A.y, stroke, alpha, 1.2);

  drawLine(ctx, A.x, A.y, E.x, E.y, stroke, alpha, 1.2);
  drawLine(ctx, B.x, B.y, F.x, F.y, stroke, alpha, 1.2);
  drawLine(ctx, C.x, C.y, G.x, G.y, stroke, alpha, 1.2);
  drawLine(ctx, D.x, D.y, H.x, H.y, stroke, alpha, 1.2);

  drawLine(ctx, E.x, E.y, F.x, F.y, stroke, alpha * 0.9, 1.2);
  drawLine(ctx, F.x, F.y, G.x, G.y, stroke, alpha * 0.9, 1.2);
  drawLine(ctx, G.x, G.y, H.x, H.y, stroke, alpha * 0.9, 1.2);
  drawLine(ctx, H.x, H.y, E.x, E.y, stroke, alpha * 0.9, 1.2);
}

function drawFaintGhost(ctx, x, y, size, depth, stroke, alpha, wobble) {
  ctx.save();
  ctx.globalAlpha = alpha * 0.28;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;

  const shiftX = Math.sin(wobble * 1.3) * 5;
  const shiftY = Math.cos(wobble * 0.95) * 4;

  drawCube(ctx, x + shiftX, y + shiftY, size, depth, stroke, alpha, wobble);
  ctx.restore();
}

function drawPattern(ctx, width, height, time) {
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#f3efe5");
  bg.addColorStop(0.5, "#ece6d9");
  bg.addColorStop(1, "#e3dccf");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const cellW = 96;
  const cellH = 84;
  const cols = Math.ceil(width / cellW) + 3;
  const rows = Math.ceil(height / cellH) + 3;

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (let row = -1; row < rows; row += 1) {
    for (let col = -1; col < cols; col += 1) {
      const seed = hash2(col, row);
      const seed2 = hash2(col + 17, row + 31);
      const seed3 = hash2(col + 41, row + 7);

      const baseX = col * cellW + (row % 2 ? cellW * 0.5 : 0);
      const baseY = row * cellH;

      const size = 30 + seed * 28;
      const depth = 18 + seed2 * 28;

      const driftX = Math.sin(time * 0.18 + seed * 8 + row * 0.15) * 10;
      const driftY = Math.cos(time * 0.14 + seed2 * 7 + col * 0.12) * 8;
      const alpha = 0.16 + seed3 * 0.28;

      const x = baseX + driftX;
      const y = baseY + driftY;
      const stroke = "rgba(24, 20, 18, 1)";

      if (seed > 0.18) {
        drawFaintGhost(ctx, x - 14, y + 10, size, depth, stroke, alpha * 0.55, time + seed * 10);
      }

      drawCube(ctx, x, y, size, depth, stroke, alpha, time + seed * 10);

      if (seed > 0.55) {
        const innerSize = Math.max(16, size * 0.52);
        const innerDepth = Math.max(10, depth * 0.58);
        drawCube(
          ctx,
          x + size * 0.22,
          y + size * 0.16,
          innerSize,
          innerDepth,
          stroke,
          alpha * 0.7,
          time * 1.15 + seed2 * 12
        );
      }
    }
  }

  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = "#ffffff";
  for (let i = 0; i < 5; i += 1) {
    const x = (width * (0.12 + i * 0.18) + Math.sin(time * 0.12 + i) * 24) % width;
    const y = (height * (0.18 + i * 0.14) + Math.cos(time * 0.1 + i) * 16) % height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 56, y - 34);
    ctx.stroke();
  }
  ctx.restore();
}

export function startBackgroundAnimation(canvas) {
  const ctx = canvas.getContext("2d");
  let frame = 0;
  let size = resizeCanvas(canvas, ctx);

  const onResize = () => {
    size = resizeCanvas(canvas, ctx);
  };

  const draw = (timestamp) => {
    const time = timestamp / 1000;
    const { width, height } = size;

    ctx.clearRect(0, 0, width, height);
    drawPattern(ctx, width, height, time);

    frame = window.requestAnimationFrame(draw);
  };

  window.addEventListener("resize", onResize, { passive: true });
  frame = window.requestAnimationFrame(draw);

  return () => {
    window.removeEventListener("resize", onResize);
    window.cancelAnimationFrame(frame);
  };
}