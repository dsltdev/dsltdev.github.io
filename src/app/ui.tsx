import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from 'react';

// ───────────── Avisos ─────────────
interface Aviso {
  id: number;
  texto: string;
  error: boolean;
}
const ContextoAvisos = createContext<(texto: string, error?: boolean) => void>(() => {});

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguiente = useRef(0);
  const avisar = useCallback((texto: string, error = false) => {
    const id = ++siguiente.current;
    setAvisos((a) => [...a, { id, texto, error }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), error ? 6000 : 3500);
  }, []);
  return (
    <ContextoAvisos.Provider value={avisar}>
      {children}
      <div className="avisos" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso${a.error ? ' aviso-error' : ''}`} role={a.error ? 'alert' : 'status'}>
            {a.texto}
          </div>
        ))}
      </div>
    </ContextoAvisos.Provider>
  );
}
export const useAvisos = () => useContext(ContextoAvisos);

export const mensajeError = (e: unknown) => (e instanceof Error ? e.message : 'Algo salió mal. Intenta de nuevo.');

// ───────────── Carga de datos ─────────────
export function useCarga<T>(cargar: () => Promise<T>, deps: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    cargar()
      .then((d) => {
        if (vigente) {
          setDatos(d);
          setError(null);
        }
      })
      .catch((e) => vigente && setError(mensajeError(e)))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  return { datos, error, cargando, recargar: () => setVersion((v) => v + 1) };
}

// ───────────── Componentes ─────────────
export function Modal({ titulo, onCerrar, children, ancho }: { titulo: string; onCerrar: () => void; children: ReactNode; ancho?: number }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);
  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} style={ancho ? { maxWidth: ancho } : undefined}>
        <header className="modal-cab">
          <h2>{titulo}</h2>
          <button type="button" className="btn-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      {children}
      {ayuda && <small>{ayuda}</small>}
    </label>
  );
}

export const Entrada = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} />;
export const Seleccion = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} />;
export const AreaTexto = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} />;

export function Vacio({ icono, titulo, texto, children }: { icono: string; titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="vacio">
      <div className="vacio-icono" aria-hidden="true">
        {icono}
      </div>
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <p className="cargando" role="status">
      {texto}
    </p>
  );
}

export function ErrorCaja({ texto, reintentar }: { texto: string; reintentar?: () => void }) {
  return (
    <div className="caja-error" role="alert">
      <span>{texto}</span>
      {reintentar && (
        <button type="button" className="btn btn-sec" onClick={reintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Cabecera({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children?: ReactNode }) {
  return (
    <div className="cabecera">
      <div>
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      <div className="cabecera-acciones">{children}</div>
    </div>
  );
}

/** Para cantidades y precios: deja el campo vacío mientras se escribe y convierte a número al leer. */
export const aNumero = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
