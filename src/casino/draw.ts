// Dibujo de los símbolos de la tragamonedas con trazos vectoriales (sin imágenes ni emoji,
// para que se vean igual en cualquier celular).
import type { Sym } from './slots';

const INK = '#1a1206';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, r);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Dibuja el símbolo centrado en (cx, cy) dentro de un cuadrado de lado 2·s. */
export function drawSymbol(ctx: CanvasRenderingContext2D, sym: Sym, cx: number, cy: number, s: number) {
  if (!(s > 1)) return; // lienzo sin medida (pestaña oculta): nada que dibujar
  ctx.save();
  ctx.translate(cx, cy);
  const r = s * 0.78;
  ctx.lineJoin = 'round';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  switch (sym) {
    case 'coin': {
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      g.addColorStop(0, '#fbe6b8');
      g.addColorStop(0.6, '#e0a23e');
      g.addColorStop(1, '#a97324');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26,18,6,0.5)';
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = `700 ${Math.round(r * 1.05)}px "IBM Plex Mono", monospace`;
      ctx.fillText('$', 0, r * 0.05);
      break;
    }
    case 'card': {
      const w = r * 2;
      const h = r * 1.35;
      const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      g.addColorStop(0, '#5b8fd0');
      g.addColorStop(1, '#2a4f86');
      ctx.fillStyle = g;
      roundRect(ctx, -w / 2, -h / 2, w, h, r * 0.18);
      ctx.fill();
      ctx.fillStyle = '#0f2340';
      ctx.fillRect(-w / 2, -h * 0.28, w, h * 0.2);
      ctx.fillStyle = '#e0a23e';
      roundRect(ctx, -w * 0.38, h * 0.08, w * 0.22, h * 0.2, r * 0.05);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(w * 0.02, h * 0.18, w * 0.34, h * 0.07);
      break;
    }
    case 'bank': {
      ctx.fillStyle = '#d9c9a4';
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 1.05, -r * 0.45);
      ctx.lineTo(-r * 1.05, -r * 0.45);
      ctx.closePath();
      ctx.fill();
      for (let i = -1; i <= 1; i++) ctx.fillRect(i * r * 0.62 - r * 0.15, -r * 0.35, r * 0.3, r * 0.95);
      ctx.fillStyle = '#b8a67e';
      ctx.fillRect(-r * 1.1, r * 0.65, r * 2.2, r * 0.22);
      ctx.fillRect(-r * 0.95, r * 0.9, r * 1.9, r * 0.14);
      break;
    }
    case 'chart': {
      const candles = [
        { x: -r * 0.7, top: -r * 0.2, bot: r * 0.5, up: false },
        { x: 0, top: -r * 0.7, bot: r * 0.2, up: true },
        { x: r * 0.7, top: -r * 0.95, bot: -r * 0.05, up: true }
      ];
      for (const c of candles) {
        ctx.strokeStyle = ctx.fillStyle = c.up ? '#7fd46a' : '#e0644e';
        ctx.lineWidth = r * 0.1;
        ctx.beginPath();
        ctx.moveTo(c.x, c.top - r * 0.15);
        ctx.lineTo(c.x, c.bot + r * 0.15);
        ctx.stroke();
        ctx.fillRect(c.x - r * 0.2, c.top, r * 0.4, c.bot - c.top);
      }
      break;
    }
    case 'diamond': {
      const g = ctx.createLinearGradient(-r, -r, r, r);
      g.addColorStop(0, '#d6f6ff');
      g.addColorStop(0.5, '#58c8f0');
      g.addColorStop(1, '#2a7fb8');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.7);
      ctx.lineTo(r * 0.55, -r * 0.7);
      ctx.lineTo(r, -r * 0.15);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, -r * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = r * 0.05;
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.15);
      ctx.lineTo(r, -r * 0.15);
      ctx.moveTo(-r * 0.55, -r * 0.7);
      ctx.lineTo(-r * 0.25, -r * 0.15);
      ctx.lineTo(0, r);
      ctx.moveTo(r * 0.55, -r * 0.7);
      ctx.lineTo(r * 0.25, -r * 0.15);
      ctx.lineTo(0, r);
      ctx.stroke();
      break;
    }
    case 'seven': {
      ctx.font = `800 ${Math.round(r * 2.1)}px "IBM Plex Mono", monospace`;
      ctx.lineWidth = r * 0.14;
      ctx.strokeStyle = '#f3c778';
      ctx.strokeText('7', 0, r * 0.08);
      ctx.fillStyle = '#e8443a';
      ctx.fillText('7', 0, r * 0.08);
      break;
    }
  }
  ctx.restore();
}
