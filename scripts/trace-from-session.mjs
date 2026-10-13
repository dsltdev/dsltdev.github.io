// Reconstruye la traza del replay a partir del transcript de una sesión de
// Claude Code (cada entrada trae su timestamp real). Alternativa a
// capture-trace.mjs cuando `claude -p` no está disponible.
//
//   node scripts/trace-from-session.mjs <transcript.jsonl>
//
// Toma lo que ocurre entre la primera narración de la auditoría y los hallazgos
// finales, y se queda solo con las llamadas de lectura sobre el fixture que
// terminaron bien. El resultado usa el mismo esquema que capture-trace.mjs.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = resolve(root, 'lab-fixtures/payouts-webhook');
const out = resolve(root, 'src/data/traces/payouts-audit.json');

// La auditoría empieza justo después de que el usuario elige cómo obtener la traza.
const ANSWER_MARKER = 'Your questions have been answered';
const END_MARKER = '**Causa raíz.**';
// Pausas largas entre eventos son esperas (permisos, usuario), no tiempo del agente.
const MAX_GAP_MS = 12_000;
const END_CUT = /\n\s*\nAhora extraigo[\s\S]*$/;

const PROMPT = [
  'El equipo reporta que las transferencias salientes (payouts) se quedan en `pending`',
  'para siempre, aunque el proveedor ya las procesó.',
  'Audita este repositorio: encuentra la causa raíz y cualquier otro riesgo en el manejo de webhooks.',
].join(' ');

const file = process.argv[2];
if (!file) {
  console.error('uso: node scripts/trace-from-session.mjs <transcript.jsonl>');
  process.exit(1);
}

const clean = (s) =>
  String(s)
    .replaceAll(`cd ${fixture} && `, '')
    .replaceAll(`cd ${fixture}\n`, '')
    .replaceAll(fixture + '/', '')
    .replaceAll(fixture, '.')
    .replaceAll(root + '/', '');
const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

const entries = (await readFile(file, 'utf8'))
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l))
  .filter((e) => (e.type === 'assistant' || e.type === 'user') && e.message?.content);

const blocksOf = (e) => (Array.isArray(e.message.content) ? e.message.content : []);
const textOf = (e) => blocksOf(e).filter((b) => b.type === 'text').map((b) => b.text).join('\n');

const answerIdx = entries.findIndex(
  (e) =>
    e.type === 'user' &&
    blocksOf(e).some((b) => b.type === 'tool_result' && JSON.stringify(b.content).includes(ANSWER_MARKER)),
);
const endIdx = entries.findIndex(
  (e, i) => i > answerIdx && e.type === 'assistant' && textOf(e).includes(END_MARKER),
);
if (answerIdx < 0 || endIdx < 0 || endIdx <= answerIdx) {
  console.error('no encontré el tramo de la auditoría (respuesta del usuario / hallazgos finales).');
  process.exit(1);
}
const slice = entries.slice(answerIdx + 1, endIdx + 1);

// Solo llamadas de lectura sobre el fixture que terminaron bien.
const failed = new Set();
for (const e of slice) {
  for (const b of blocksOf(e)) if (b.type === 'tool_result' && b.is_error) failed.add(b.tool_use_id);
}
const isFixtureRead = (b) => {
  if (b.type !== 'tool_use' || failed.has(b.id)) return false;
  const raw = JSON.stringify(b.input);
  if (!raw.includes('lab-fixtures/payouts-webhook')) return false;
  if (b.name === 'Read') return true;
  return b.name === 'Bash' && /^\s*(cd [^\n&]+&&\s*)?(find|grep)\b/.test(b.input.command ?? '');
};

const keptTools = new Set();
const events = [];
const seen = new Set();
let model;

for (const e of slice) {
  const t = Date.parse(e.timestamp); // ms reales; se normalizan al final
  if (e.type === 'assistant') {
    model ??= e.message.model;
    for (const b of blocksOf(e)) {
      if (b.type === 'text' && b.text.trim()) {
        const isFinal = b.text.includes(END_MARKER);
        const text = clean(b.text.trim().replace(isFinal ? END_CUT : /$^/, ''));
        const key = (isFinal ? 'final:' : 'text:') + text;
        if (seen.has(key)) continue;
        seen.add(key);
        events.push({ t, kind: isFinal ? 'final' : 'text', text });
      } else if (isFixtureRead(b) && !seen.has(b.id)) {
        seen.add(b.id);
        keptTools.add(b.id);
        const input = JSON.parse(clean(JSON.stringify(b.input)));
        events.push({ t, kind: 'tool', id: b.id, name: b.name, input });
      }
    }
  } else {
    for (const b of blocksOf(e)) {
      if (b.type !== 'tool_result' || !keptTools.has(b.tool_use_id) || seen.has('r' + b.tool_use_id)) continue;
      seen.add('r' + b.tool_use_id);
      const raw = Array.isArray(b.content)
        ? b.content.map((c) => c.text ?? '').join('\n')
        : String(b.content ?? '');
      events.push({
        t,
        kind: 'result',
        id: b.tool_use_id,
        ok: !b.is_error,
        length: raw.length,
        preview: clip(clean(raw), 400),
      });
    }
  }
}

// Normaliza tiempos: relativos al primer evento y con las esperas largas recortadas.
const rawSpanMs = events.at(-1).t - events[0].t;
let cappedGaps = 0;
let clock = 0;
let prev = events[0].t;
for (const ev of events) {
  const gap = ev.t - prev;
  if (gap > MAX_GAP_MS) cappedGaps++;
  clock += Math.min(gap, MAX_GAP_MS);
  prev = ev.t;
  ev.t = clock;
}

const trace = {
  capturedAt: slice[0].timestamp.slice(0, 10),
  fixture: 'lab-fixtures/payouts-webhook',
  prompt: PROMPT,
  meta: {
    source: 'session',
    model,
    durationMs: clock,
    rawSpanMs,
    cappedGaps,
    toolCalls: keptTools.size,
    tools: ['Read', 'Bash (find y grep, solo lectura)'],
  },
  events,
};

await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(trace, null, 2) + '\n');
console.log(`traza guardada: ${events.length} eventos, ${(trace.meta.durationMs / 1000).toFixed(1)}s → ${out}`);
