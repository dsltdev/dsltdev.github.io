// Sonido y vibración. Todo se sintetiza con WebAudio: sin archivos que descargar.
// Los navegadores solo dejan sonar tras un gesto del jugador, así que el contexto
// se crea con el primer toque.
const PREFS_KEY = 'pagos-idle:prefs';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = readPref();
let lastClickAt = 0;
let activated = false;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function readPref(): boolean {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw).sound !== false : true;
  } catch {
    return true;
  }
}

export const isSoundOn = () => enabled;

export function setSound(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ sound: on }));
  } catch {
    /* sin almacenamiento no se recuerda la preferencia */
  }
  if (on) unlock();
}

/** Crea o reanuda el contexto de audio. Llamar desde un gesto del jugador. */
export function unlock() {
  activated = true;
  if (!enabled) return;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

/** Una nota corta con envolvente suave (evita el "clic" de cortar la onda de golpe). */
function tone(freq: number, start: number, dur: number, vol: number, type: OscillatorType = 'sine', slideTo?: number) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export type Sfx = 'click' | 'buy' | 'upgrade' | 'achievement' | 'golden' | 'spawn' | 'prestige' | 'win' | 'lose';

export function play(name: Sfx) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  switch (name) {
    case 'click': {
      // Limitado: tocar muy rápido no debe convertirse en un zumbido.
      const now = performance.now();
      if (now - lastClickAt < 45) return;
      lastClickAt = now;
      const f = 620 + Math.random() * 120;
      tone(f, 0, 0.07, 0.07, 'triangle', f * 1.25);
      break;
    }
    case 'buy':
      tone(392, 0, 0.1, 0.08, 'triangle');
      tone(587, 0.07, 0.14, 0.08, 'triangle');
      break;
    case 'upgrade':
      tone(440, 0, 0.09, 0.07, 'triangle');
      tone(554, 0.06, 0.09, 0.07, 'triangle');
      tone(740, 0.12, 0.18, 0.08, 'triangle');
      break;
    case 'achievement':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.2, 0.07, 'sine'));
      break;
    case 'golden':
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.25, 0.08, 'triangle'));
      break;
    case 'spawn':
      tone(1319, 0, 0.12, 0.05, 'sine');
      tone(1760, 0.1, 0.18, 0.05, 'sine');
      break;
    case 'win':
      tone(523, 0, 0.12, 0.08, 'triangle');
      tone(784, 0.09, 0.2, 0.08, 'triangle');
      break;
    case 'lose':
      tone(330, 0, 0.14, 0.07, 'sawtooth', 247);
      tone(220, 0.1, 0.22, 0.06, 'sawtooth', 165);
      break;
    case 'prestige':
      [330, 440, 554, 659, 880].forEach((f, i) => tone(f, i * 0.09, 0.3, 0.08, 'triangle'));
      break;
  }
}

/** Vibración corta en celulares que la soportan (Android). Respeta "reducir movimiento". */
export function buzz(ms: number) {
  // Chrome bloquea (y registra un error) si se vibra antes de que la persona haya tocado la página.
  const userActive = navigator.userActivation ? navigator.userActivation.hasBeenActive : activated;
  if (!enabled || reducedMotion || !userActive) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* no soportado */
  }
}
