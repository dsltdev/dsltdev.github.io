// Controlador de la banda "Partida Doble" de la landing: monta el lienzo, avanza la simulación con paso fijo
// y se detiene cuando nadie la mira (pestaña oculta, fuera de pantalla, o "reducir movimiento").

import { PartidaDoble, adaptParams, DT } from './partida-doble';

const SEMILLA = 4;
const PRECALENTAR = 60 * 12; // 12 s de libro ya escrito al cargar
const MAX_DPR = 2;
const MAX_PASOS_POR_CUADRO = 6; // si la pestaña estuvo congelada, no se "pone al día" de golpe

export interface Libro {
  setPlaying(on: boolean): void;
  destroy(): void;
}

function altoPara(ancho: number) {
  return Math.round(Math.max(210, Math.min(340, ancho * 0.27)));
}

export function montarLibro(
  canvas: HTMLCanvasElement,
  opts: { reducedMotion: boolean; onStats?: (cerrados: number, sinPareja: number) => void; onPlayingChange?: (on: boolean) => void }
): Libro {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { setPlaying() {}, destroy() {} };

  let g: PartidaDoble | null = null;
  let playing = !opts.reducedMotion;
  let visible = true;
  let pageVisible = !document.hidden;
  let raf = 0;
  let last = 0;
  let acc = 0;
  let statsAt = 0;

  const construir = () => {
    const ancho = Math.max(280, Math.round(canvas.parentElement?.clientWidth ?? canvas.clientWidth ?? 800));
    const alto = altoPara(ancho);
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    canvas.width = Math.round(ancho * dpr);
    canvas.height = Math.round(alto * dpr);
    canvas.style.height = `${alto}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    g = new PartidaDoble(adaptParams(ancho, alto, { seed: SEMILLA }), ancho, alto);
    g.warm(PRECALENTAR);
    g.render(ctx);
    reportar(true);
  };

  const reportar = (forzar = false) => {
    if (!g || !opts.onStats) return;
    const now = performance.now();
    if (!forzar && now - statsAt < 250) return;
    statsAt = now;
    const s = g.stats();
    opts.onStats(s.closed, s.orphansSpawned);
  };

  const cuadro = (now: number) => {
    raf = 0;
    if (!g || !playing || !visible || !pageVisible) return;
    if (!last) last = now;
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    let n = 0;
    while (acc >= DT && n < MAX_PASOS_POR_CUADRO) {
      g.step();
      acc -= DT;
      n++;
    }
    if (n === MAX_PASOS_POR_CUADRO) acc = 0;
    g.render(ctx);
    reportar();
    raf = requestAnimationFrame(cuadro);
  };

  const sincronizar = () => {
    const debeCorrer = playing && visible && pageVisible;
    if (debeCorrer && !raf) {
      last = 0;
      acc = 0;
      raf = requestAnimationFrame(cuadro);
    } else if (!debeCorrer && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  construir();

  const io = new IntersectionObserver(
    (entradas) => {
      visible = entradas.some((e) => e.isIntersecting);
      sincronizar();
    },
    { threshold: 0.05 }
  );
  io.observe(canvas);

  const onVis = () => {
    pageVisible = !document.hidden;
    sincronizar();
  };
  document.addEventListener('visibilitychange', onVis);

  // Si cambia el ancho, se vuelve a escribir el libro (misma semilla, mismo carácter).
  let anchoPrevio = canvas.parentElement?.clientWidth ?? 0;
  let tRedim = 0;
  const ro = new ResizeObserver(() => {
    const ancho = canvas.parentElement?.clientWidth ?? 0;
    if (Math.abs(ancho - anchoPrevio) < 2) return;
    anchoPrevio = ancho;
    window.clearTimeout(tRedim);
    tRedim = window.setTimeout(() => {
      construir();
      sincronizar();
    }, 160);
  });
  if (canvas.parentElement) ro.observe(canvas.parentElement);

  sincronizar();

  return {
    setPlaying(on) {
      if (on === playing) return;
      playing = on;
      opts.onPlayingChange?.(on);
      sincronizar();
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.clearTimeout(tRedim);
    }
  };
}
