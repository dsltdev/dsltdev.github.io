// Corre un agente real (Claude Code headless, tools de solo lectura) sobre el
// fixture y guarda la traza normalizada, con tiempos, para el replay de /lab/agente.
//
//   node scripts/capture-trace.mjs
//
// Usa la sesión de `claude` ya autenticada. Cada ejecución consume uso real.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = resolve(root, 'lab-fixtures/payouts-webhook');
const out = resolve(root, 'src/data/traces/payouts-audit.json');

const SYSTEM = [
  'Eres un auditor de integraciones de pagos.',
  'Trabajas solo con Read, Grep y Glob: no modificas nada.',
  'Antes de cada paso escribe una sola frase corta diciendo qué vas a revisar y por qué.',
  'Responde siempre en español.',
].join(' ');

const PROMPT = [
  'El equipo reporta que las transferencias salientes (payouts) se quedan en `pending`',
  'para siempre, aunque el proveedor ya las procesó.',
  'Audita este repositorio: encuentra la causa raíz y cualquier otro riesgo en el manejo de webhooks.',
  'Termina con la lista de hallazgos, una línea por hallazgo, con este formato exacto:',
  '- [CRÍTICO|ALTO|MEDIO|BAJO] título corto — archivo:línea',
  'y en la línea siguiente, indentada, una frase con la causa y el arreglo.',
].join(' ');

const args = [
  '-p', PROMPT,
  '--output-format', 'stream-json',
  '--verbose',
  '--setting-sources', '',
  '--strict-mcp-config',
  '--disable-slash-commands',
  '--no-session-persistence',
  '--tools', 'Read,Grep,Glob',
  '--allowedTools', 'Read', 'Grep', 'Glob',
  '--system-prompt', SYSTEM,
];

const clean = (s) => String(s).replaceAll(fixture + '/', '').replaceAll(fixture, '.');
const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

const events = [];
const meta = {};
const start = Date.now();
const stamp = () => Date.now() - start;

function handle(msg) {
  const t = stamp();
  if (msg.type === 'assistant') {
    for (const block of msg.message.content ?? []) {
      if (block.type === 'text' && block.text.trim()) {
        events.push({ t, kind: 'text', text: clean(block.text.trim()) });
      } else if (block.type === 'thinking' && block.thinking?.trim()) {
        events.push({ t, kind: 'thinking', text: clean(block.thinking.trim()) });
      } else if (block.type === 'tool_use') {
        const input = JSON.parse(clean(JSON.stringify(block.input)));
        events.push({ t, kind: 'tool', id: block.id, name: block.name, input });
      }
    }
  } else if (msg.type === 'user') {
    for (const block of msg.message.content ?? []) {
      if (block.type !== 'tool_result') continue;
      const raw = Array.isArray(block.content)
        ? block.content.map((c) => c.text ?? '').join('\n')
        : String(block.content ?? '');
      events.push({
        t,
        kind: 'result',
        id: block.tool_use_id,
        ok: !block.is_error,
        length: raw.length,
        preview: clip(clean(raw), 400),
      });
    }
  } else if (msg.type === 'result') {
    meta.durationMs = msg.duration_ms;
    meta.turns = msg.num_turns;
    meta.costUsd = msg.total_cost_usd;
    meta.usage = msg.usage
      ? { input: msg.usage.input_tokens, output: msg.usage.output_tokens }
      : undefined;
    meta.isError = Boolean(msg.is_error);
    events.push({ t, kind: 'final', text: clean(msg.result ?? '') });
  } else if (msg.type === 'system' && msg.subtype === 'init') {
    meta.model = msg.model;
  }
}

const child = spawn('claude', args, { cwd: fixture, stdio: ['ignore', 'pipe', 'inherit'] });
const timeout = setTimeout(() => child.kill('SIGTERM'), 5 * 60_000);

let buffer = '';
child.stdout.on('data', (chunk) => {
  buffer += chunk;
  let i;
  while ((i = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, i).trim();
    buffer = buffer.slice(i + 1);
    if (!line) continue;
    try {
      handle(JSON.parse(line));
    } catch (err) {
      console.error('línea no parseable:', clip(line, 120), err.message);
    }
  }
});

child.on('close', async (code) => {
  clearTimeout(timeout);
  if (code !== 0 || !events.some((e) => e.kind === 'final')) {
    console.error(`claude terminó con código ${code}; no se guarda la traza.`);
    process.exit(1);
  }
  const trace = {
    capturedAt: new Date().toISOString().slice(0, 10),
    fixture: 'lab-fixtures/payouts-webhook',
    prompt: PROMPT,
    meta,
    events,
  };
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(trace, null, 2) + '\n');
  console.log(`traza guardada: ${events.length} eventos, ${(stamp() / 1000).toFixed(1)}s → ${out}`);
});
