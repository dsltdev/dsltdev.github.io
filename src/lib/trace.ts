// Tipos y utilidades puras para el replay del agente (/lab/agente).

export type TraceEvent =
  | { t: number; kind: 'text'; text: string }
  | { t: number; kind: 'thinking'; text: string }
  | { t: number; kind: 'final'; text: string }
  | { t: number; kind: 'tool'; id: string; name: string; input: Record<string, unknown> }
  | { t: number; kind: 'result'; id: string; ok: boolean; length: number; preview: string };

export interface Trace {
  capturedAt: string;
  fixture: string;
  prompt: string;
  meta: {
    source: string;
    model?: string;
    durationMs: number;
    rawSpanMs?: number;
    cappedGaps?: number;
    toolCalls: number;
    tools: string[];
  };
  events: TraceEvent[];
}

export type ToolKind = 'read' | 'find' | 'grep' | 'other';

export interface TraceNode {
  key: string;
  label: string;
  kind: ToolKind;
}

export interface ToolStep {
  id: string;
  node: number; // índice en `nodes`
  kind: ToolKind;
  command: string; // línea que se muestra en el feed
  tCall: number;
  tResult: number;
  ok: boolean;
  summary: string;
}

const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function describeCall(name: string, input: Record<string, unknown>): { kind: ToolKind; key: string; label: string; command: string } {
  if (name === 'Read') {
    const path = String(input.file_path ?? '');
    return { kind: 'read', key: path, label: path.replace(/^src\//, ''), command: `Read ${path}` };
  }
  const cmd = String(input.command ?? '').replace(/^\s*cd [^\n&]+&&\s*/, '');
  if (/^\s*find\b/.test(cmd)) {
    return { kind: 'find', key: 'find', label: 'find .', command: trunc(cmd, 70) };
  }
  if (/\bgrep\b/.test(cmd)) {
    const pattern = cmd.match(/'([^']+)'/)?.[1] ?? '';
    return { kind: 'grep', key: 'grep:' + pattern, label: `grep ${trunc(pattern, 16)}`, command: trunc(cmd, 70) };
  }
  return { kind: 'other', key: name + cmd, label: name, command: trunc(cmd || name, 70) };
}

function summarize(kind: ToolKind, length: number, preview: string): string {
  const truncated = preview.endsWith('…');
  const lines = preview.split('\n').filter(Boolean).length;
  if (kind === 'find') {
    const files = preview.trim().split(/\s+/).filter(Boolean).length;
    return `${files}${truncated ? '+' : ''} archivos`;
  }
  if (kind === 'grep') return `${lines}${truncated ? '+' : ''} coincidencias`;
  return length >= 1024 ? `${(length / 1024).toFixed(1)} KB` : `${length} B`;
}

/** Empareja cada llamada con su resultado y agrupa las llamadas por nodo (archivo o comando). */
export function buildSteps(trace: Trace): { nodes: TraceNode[]; steps: ToolStep[] } {
  const results = new Map<string, Extract<TraceEvent, { kind: 'result' }>>();
  for (const e of trace.events) if (e.kind === 'result') results.set(e.id, e);

  const nodes: TraceNode[] = [];
  const index = new Map<string, number>();
  const steps: ToolStep[] = [];

  for (const e of trace.events) {
    if (e.kind !== 'tool') continue;
    const d = describeCall(e.name, e.input);
    let node = index.get(d.key);
    if (node === undefined) {
      node = nodes.length;
      index.set(d.key, node);
      nodes.push({ key: d.key, label: d.label, kind: d.kind });
    }
    const r = results.get(e.id);
    steps.push({
      id: e.id,
      node,
      kind: d.kind,
      command: d.command,
      tCall: e.t,
      tResult: r?.t ?? e.t,
      ok: r?.ok ?? true,
      summary: r ? summarize(d.kind, r.length, r.preview) : '',
    });
  }
  return { nodes, steps };
}

export type Severity = 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO';

export interface Finding {
  sev: Severity;
  title: string;
  where: string;
  detail: string;
}

/** Separa el texto final en resumen + hallazgos (`- [SEV] título — archivo:línea` y detalle indentado). */
export function parseFinal(text: string): { summary: string; findings: Finding[] } {
  const summary: string[] = [];
  const findings: Finding[] = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^-\s*\[(CRÍTICO|ALTO|MEDIO|BAJO)\]\s*(.+?)\s+—\s+(.+)$/);
    if (m) {
      findings.push({ sev: m[1] as Severity, title: m[2], where: m[3], detail: '' });
    } else if (findings.length && /^\s+\S/.test(line)) {
      const last = findings[findings.length - 1];
      last.detail = (last.detail + ' ' + line.trim()).trim();
    } else if (!findings.length) {
      summary.push(line);
    }
  }
  return { summary: summary.join('\n').trim(), findings };
}

/** Escapa HTML y aplica **negrita** y `código` en línea. */
export function inlineMd(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
