// Cursor-reactive background: a sparse field of characters in the side margins that
// light up towards teal near the cursor
(() => {
  const SPACING = 22, RADIUS = 170, PUSH = 3, FONT_SIZE = 13;
  const BASE_ALPHA = 0.12, PEAK_ALPHA = 1, EASE = 0.12;
  const DENSITY = 0.45, GLYPHS = "01{}$~/<>|;*#&";
  // Keep the text column clear: no cells within GUTTER of it, fading in over FADE
  const GUTTER = 24, FADE = 64;

  const canvas = document.createElement("canvas");
  canvas.className = "bg-field";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");

  const css = getComputedStyle(document.documentElement);
  const hex = (name) => {
    const v = css.getPropertyValue(name).trim().replace("#", "");
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  };
  const dim = hex("--dim"), teal = hex("--teal");
  const font = css.getPropertyValue("--font");

  // Static field only when the user prefers less motion or has no hovering pointer
  const interactive =
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Stable per-cell pseudo-random number so each cell keeps its glyph across redraws
  const rand = (ix, iy) => {
    let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };

  let w = 0, h = 0, cells = [];
  const target = { x: -1e4, y: -1e4 }, pos = { x: -1e4, y: -1e4 };
  let frame = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `500 ${FONT_SIZE}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const page = document.querySelector(".page");
    const rect = page.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(page).paddingLeft) || 0;
    const left = rect.left + pad - GUTTER, right = rect.right - pad + GUTTER;

    cells = [];
    const off = SPACING / 2;
    for (let iy = 0, y = off; y < h; iy++, y += SPACING) {
      for (let ix = 0, x = off; x < w; ix++, x += SPACING) {
        const gap = x < left ? left - x : x > right ? x - right : 0;
        if (!gap) continue;
        const r = rand(ix, iy);
        if (r >= DENSITY) continue;
        cells.push({
          x, y,
          fade: Math.min(1, gap / FADE),
          glyph: GLYPHS[Math.floor((r / DENSITY) * GLYPHS.length)],
        });
      }
    }
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const cell of cells) {
      const dx = cell.x - pos.x, dy = cell.y - pos.y;
      const d = Math.hypot(dx, dy);
      let t = d < RADIUS ? 1 - d / RADIUS : 0;
      t *= t;
      const x = t && d ? cell.x + (dx / d) * PUSH * t : cell.x;
      const y = t && d ? cell.y + (dy / d) * PUSH * t : cell.y;
      const c = dim.map((v, i) => Math.round(v + (teal[i] - v) * t));
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(BASE_ALPHA + (PEAK_ALPHA - BASE_ALPHA) * t) * cell.fade})`;
      ctx.fillText(cell.glyph, x, y);
    }
  }

  // Ease the glow towards the cursor so it trails slightly instead of snapping
  function tick() {
    pos.x += (target.x - pos.x) * EASE;
    pos.y += (target.y - pos.y) * EASE;
    draw();
    frame = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.5
      ? requestAnimationFrame(tick)
      : 0;
  }

  function moveTo(x, y) {
    target.x = x;
    target.y = y;
    // Jump straight in when entering from off-screen rather than sweeping across
    if (pos.x < -1e3) { pos.x = x; pos.y = y; }
    if (!frame) frame = requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  if (interactive) {
    window.addEventListener("mousemove", (e) => moveTo(e.clientX, e.clientY), { passive: true });
    document.documentElement.addEventListener("mouseleave", () => {
      pos.x = pos.y = target.x = target.y = -1e4;
      draw();
    });
  }
  // Wait for the web font so glyphs render in Source Code Pro rather than a fallback
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(resize);
})();
