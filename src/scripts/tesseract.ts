export type TesseractOptions = {
  canvas: HTMLCanvasElement;
  auto4d?: boolean;
  compact?: boolean;
};

type Vec4 = [number, number, number, number];

const VERTICES: Vec4[] = [];
for (const x of [-1, 1] as const) {
  for (const y of [-1, 1] as const) {
    for (const z of [-1, 1] as const) {
      for (const w of [-1, 1] as const) {
        VERTICES.push([x, y, z, w]);
      }
    }
  }
}

const EDGES: [number, number][] = [];
for (let i = 0; i < VERTICES.length; i++) {
  for (let j = i + 1; j < VERTICES.length; j++) {
    let diff = 0;
    for (let k = 0; k < 4; k++) {
      if (VERTICES[i][k] !== VERTICES[j][k]) diff++;
    }
    if (diff === 1) EDGES.push([i, j]);
  }
}

function rot(p: Vec4, a: { xy: number; xz: number; yz: number; xw: number; yw: number; zw: number }): Vec4 {
  let [x, y, z, w] = p;
  let c = Math.cos(a.xy);
  let s = Math.sin(a.xy);
  [x, y] = [x * c - y * s, x * s + y * c];
  c = Math.cos(a.xz);
  s = Math.sin(a.xz);
  [x, z] = [x * c - z * s, x * s + z * c];
  c = Math.cos(a.yz);
  s = Math.sin(a.yz);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(a.xw);
  s = Math.sin(a.xw);
  [x, w] = [x * c - w * s, x * s + w * c];
  c = Math.cos(a.yw);
  s = Math.sin(a.yw);
  [y, w] = [y * c - w * s, y * s + w * c];
  c = Math.cos(a.zw);
  s = Math.sin(a.zw);
  [z, w] = [z * c - w * s, z * s + w * c];
  return [x, y, z, w];
}

export type TesseractHandle = {
  setAuto4d: (on: boolean) => void;
  setAngles: (partial: Partial<Record<'xy' | 'xz' | 'yz' | 'xw' | 'yw' | 'zw', number>>) => void;
  reset: () => void;
  destroy: () => void;
};

export function mountTesseract(opts: TesseractOptions): TesseractHandle {
  const canvas = opts.canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      setAuto4d() {},
      setAngles() {},
      reset() {},
      destroy() {},
    };
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let auto4d = opts.auto4d ?? !prefersReduced;
  const angles = { xy: 0.55, xz: 0.32, yz: 0.18, xw: 0.4, yw: 0.15, zw: 0.7 };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let raf = 0;
  let running = true;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  const draw = () => {
    resize();
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const dist4 = 3.2;
    const dist3 = 3.6;
    const scale = Math.min(width, height) * (opts.compact ? 1.55 : 1.85);
    const cx = width / 2;
    const cy = height / 2;

    const projected = VERTICES.map((v) => {
      const p = rot(v, angles);
      const persp4 = 1 / (dist4 - p[3]);
      const x3 = p[0] * persp4;
      const y3 = p[1] * persp4;
      const z3 = p[2] * persp4;
      const persp3 = 1 / (dist3 - z3);
      return {
        x: cx + x3 * persp3 * scale,
        y: cy + y3 * persp3 * scale,
        z: z3,
        w: p[3],
        origW: v[3],
      };
    });

    const sorted = EDGES.map((e, i) => {
      const a = projected[e[0]];
      const b = projected[e[1]];
      return { i, a, b, depth: (a.z + b.z) / 2, sameW: VERTICES[e[0]][3] === VERTICES[e[1]][3] };
    }).sort((p, q) => p.depth - q.depth);

    for (const edge of sorted) {
      const t = (edge.depth + 0.8) / 1.6;
      const alpha = 0.22 + Math.max(0, Math.min(1, t)) * 0.72;
      const widthPx = (edge.sameW ? 1.4 : 2.15) * (opts.compact ? 0.9 : 1.15);
      ctx.beginPath();
      ctx.moveTo(edge.a.x, edge.a.y);
      ctx.lineTo(edge.b.x, edge.b.y);
      if (edge.sameW) {
        ctx.strokeStyle = `rgba(239, 230, 214, ${alpha * 0.85})`;
      } else {
        ctx.strokeStyle = `rgba(224, 162, 62, ${alpha})`;
        ctx.shadowColor = 'rgba(224, 162, 62, 0.55)';
        ctx.shadowBlur = 10;
      }
      ctx.lineWidth = widthPx;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    for (const p of projected) {
      const r = 3.2 + (p.w + 1) * 1.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = p.origW > 0 ? 'rgba(243, 199, 120, 0.95)' : 'rgba(239, 230, 214, 0.8)';
      ctx.fill();
    }
  };

  const tick = () => {
    if (!running) return;
    if (auto4d && !prefersReduced && !dragging) {
      angles.xw += 0.012;
      angles.yw += 0.007;
      angles.zw += 0.009;
      angles.xy += 0.0035;
      angles.yz += 0.002;
    }
    draw();
    raf = requestAnimationFrame(tick);
  };

  const onPointerDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    if (e.shiftKey) {
      angles.xw += dx * 0.01;
      angles.zw += dy * 0.01;
    } else {
      angles.xy += dx * 0.008;
      angles.xz += dy * 0.008;
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    dragging = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  const onResize = () => draw();
  window.addEventListener('resize', onResize);

  tick();

  return {
    setAuto4d(on) {
      auto4d = on && !prefersReduced;
    },
    setAngles(partial) {
      Object.assign(angles, partial);
      draw();
    },
    reset() {
      angles.xy = 0.55;
      angles.xz = 0.32;
      angles.yz = 0.18;
      angles.xw = 0.4;
      angles.yw = 0.15;
      angles.zw = 0.7;
      draw();
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    },
  };
}
