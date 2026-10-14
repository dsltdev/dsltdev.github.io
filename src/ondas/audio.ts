// Sonido del simulador con WebAudio. Cada onda es un oscilador -> ganancia -> retardo -> mezcla -> limitador.
//
// - El retardo es lo que da la fase: retrasar un oscilador 1/(2f) segundos lo deja invertido (180°).
// - Los cambios se aplican con setTargetAtTime (transición de ~15 ms) para que no se oigan "clics".
// - La mezcla se escala para que la suma de las dos ondas nunca pase de 0,5 de la señal máxima, y un limitador
//   protege el oído ante cualquier combinación.
// - Los navegadores solo dejan sonar tras un gesto del usuario: `iniciar` debe llamarse desde un clic.
import { FORMAS, picoMaximo, type Estado, type Osc } from './waves';

/** Nivel máximo de la mezcla con el volumen al 100 %. */
const NIVEL_MAX = 0.5;
/** Constante de tiempo de las transiciones (segundos). */
const SUAVIZADO = 0.015;

interface Canal {
  osc: OscillatorNode;
  ganancia: GainNode;
  retardo: DelayNode;
}

type ConstructorAudio = typeof AudioContext;

function constructorAudio(): ConstructorAudio | null {
  const w = window as unknown as { AudioContext?: ConstructorAudio; webkitAudioContext?: ConstructorAudio };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export const audioDisponible = () => constructorAudio() !== null;

export class Sintetizador {
  private ctx: AudioContext | null = null;
  private mezcla: GainNode | null = null;
  private canales: Canal[] = [];

  get activo(): boolean {
    return this.ctx !== null;
  }

  async iniciar(estado: Estado): Promise<void> {
    if (this.ctx) return;
    const Ctor = constructorAudio();
    if (!Ctor) throw new Error('Este navegador no permite audio.');
    const ctx = new Ctor();
    const mezcla = ctx.createGain();
    mezcla.gain.value = 0; // arranca en silencio y sube con suavidad
    const limitador = ctx.createDynamicsCompressor();
    limitador.threshold.value = -12;
    limitador.knee.value = 0;
    limitador.ratio.value = 20;
    limitador.attack.value = 0.003;
    limitador.release.value = 0.1;
    mezcla.connect(limitador);
    limitador.connect(ctx.destination);

    this.canales = [0, 1].map(() => {
      const osc = ctx.createOscillator();
      const ganancia = ctx.createGain();
      ganancia.gain.value = 0;
      const retardo = ctx.createDelay(0.1);
      osc.connect(ganancia);
      ganancia.connect(retardo);
      retardo.connect(mezcla);
      osc.start();
      return { osc, ganancia, retardo };
    });
    this.ctx = ctx;
    this.mezcla = mezcla;
    this.aplicar(estado, true);
    try {
      await ctx.resume();
    } catch (e) {
      this.detener(true);
      throw e;
    }
  }

  /** Aplica el estado actual a los osciladores. Se puede llamar en cada cambio de un control. */
  aplicar(estado: Estado, inmediato = false): void {
    const ctx = this.ctx;
    if (!ctx || !this.mezcla) return;
    const ahora = ctx.currentTime;
    const tc = inmediato ? 0.001 : SUAVIZADO;
    const ondas: Osc[] = [estado.a, estado.b];
    ondas.forEach((o, i) => {
      const c = this.canales[i];
      c.osc.type = FORMAS.find((f) => f.id === o.forma)?.web ?? 'sine';
      c.osc.frequency.setTargetAtTime(o.freq, ahora, tc);
      c.ganancia.gain.setTargetAtTime(o.activo ? o.amp : 0, ahora, tc);
      c.retardo.delayTime.setTargetAtTime(o.fase / 360 / o.freq, ahora, tc);
    });
    // Si las dos ondas suman más de 1, se baja la mezcla para no pasarse del nivel máximo.
    const nivel = (estado.volumen * NIVEL_MAX) / Math.max(1, picoMaximo(estado));
    this.mezcla.gain.setTargetAtTime(nivel, ahora, tc);
  }

  /** Apaga el sonido con una bajada rápida (sin chasquido) y libera el audio. */
  detener(ya = false): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.ctx = null;
    const canales = this.canales;
    const mezcla = this.mezcla;
    this.canales = [];
    this.mezcla = null;
    if (mezcla && !ya) mezcla.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
    window.setTimeout(
      () => {
        for (const c of canales) {
          try {
            c.osc.stop();
          } catch {
            /* ya estaba detenido */
          }
        }
        void ctx.close().catch(() => {});
      },
      ya ? 0 : 120
    );
  }
}
