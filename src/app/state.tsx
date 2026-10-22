import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import type { Categoria, Cuenta } from './lib/types';

interface Estado {
  session: Session | null;
  /** false mientras se lee la sesión guardada; evita mostrar el login un instante. */
  listo: boolean;
  recuperando: boolean;
  terminarRecuperacion: () => void;
  cerrarSesion: () => Promise<void>;
  /** Cuentas (con saldo actual) y categorías: se usan en casi todas las pantallas. */
  cuentas: Cuenta[];
  categorias: Categoria[];
  cargandoDatos: boolean;
  errorDatos: string | null;
  recargarDatos: () => Promise<void>;
}

const Contexto = createContext<Estado | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [listo, setListo] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);
  const userId = session?.user.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setListo(true);
    });
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSession(s);
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const recargarDatos = useCallback(async () => {
    if (!userId) {
      setCuentas([]);
      setCategorias([]);
      return;
    }
    setCargandoDatos(true);
    setErrorDatos(null);
    try {
      // La primera vez crea las categorías de partida; después no hace nada.
      await supabase.rpc('preparar_categorias');
      const [c, k] = await Promise.all([
        supabase.from('cuentas_saldo').select('id, nombre, tipo, saldo_inicial, archivada, saldo').order('nombre'),
        supabase.from('categorias').select('id, nombre, tipo, presupuesto_mensual').order('nombre')
      ]);
      if (c.error) throw new Error(c.error.message);
      if (k.error) throw new Error(k.error.message);
      setCuentas(c.data as Cuenta[]);
      setCategorias(k.data as Categoria[]);
    } catch (e) {
      setErrorDatos(e instanceof Error ? e.message : 'No se pudieron cargar tus datos.');
    } finally {
      setCargandoDatos(false);
    }
  }, [userId]);

  useEffect(() => {
    void recargarDatos();
  }, [recargarDatos]);

  const valor = useMemo<Estado>(
    () => ({
      session,
      listo,
      recuperando,
      terminarRecuperacion: () => setRecuperando(false),
      cerrarSesion: async () => {
        await supabase.auth.signOut();
        setCuentas([]);
        setCategorias([]);
      },
      cuentas,
      categorias,
      cargandoDatos,
      errorDatos,
      recargarDatos
    }),
    [session, listo, recuperando, cuentas, categorias, cargandoDatos, errorDatos, recargarDatos]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useApp() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useApp fuera de AppProvider');
  return c;
}
