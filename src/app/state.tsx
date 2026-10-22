import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import type { Negocio, Rol } from './lib/types';

interface Estado {
  session: Session | null;
  /** false mientras se lee la sesión guardada; evita mostrar el login un instante. */
  listo: boolean;
  recuperando: boolean;
  terminarRecuperacion: () => void;
  negocios: Negocio[];
  negocio: Negocio | null;
  cargandoNegocios: boolean;
  elegirNegocio: (id: string) => void;
  recargarNegocios: (elegir?: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const Contexto = createContext<Estado | null>(null);
const CLAVE = 'negocio-activo';

const leerGuardado = () => {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
};
const guardar = (id: string) => {
  try {
    localStorage.setItem(CLAVE, id);
  } catch {
    /* modo privado: se pierde la preferencia, nada más */
  }
};

interface FilaMiembro {
  rol: Rol;
  negocios: { id: string; nombre: string; moneda: string } | null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [listo, setListo] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [cargandoNegocios, setCargandoNegocios] = useState(false);
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

  const recargarNegocios = useCallback(
    async (elegir?: string) => {
      if (!userId) {
        setNegocios([]);
        setNegocioId(null);
        return;
      }
      setCargandoNegocios(true);
      const { data } = await supabase.from('miembros').select('rol, negocios(id, nombre, moneda)').eq('user_id', userId);
      const lista = ((data ?? []) as unknown as FilaMiembro[])
        .filter((f) => f.negocios)
        .map((f) => ({ ...f.negocios!, rol: f.rol }));
      setNegocios(lista);
      setNegocioId((actual) => {
        const preferido = elegir ?? actual ?? leerGuardado();
        const id = lista.find((n) => n.id === preferido)?.id ?? lista[0]?.id ?? null;
        if (id) guardar(id);
        return id;
      });
      setCargandoNegocios(false);
    },
    [userId]
  );

  useEffect(() => {
    void recargarNegocios();
  }, [recargarNegocios]);

  const valor = useMemo<Estado>(
    () => ({
      session,
      listo,
      recuperando,
      terminarRecuperacion: () => setRecuperando(false),
      negocios,
      negocio: negocios.find((n) => n.id === negocioId) ?? null,
      cargandoNegocios,
      elegirNegocio: (id) => {
        guardar(id);
        setNegocioId(id);
      },
      recargarNegocios,
      cerrarSesion: async () => {
        await supabase.auth.signOut();
        setNegocios([]);
        setNegocioId(null);
      }
    }),
    [session, listo, recuperando, negocios, negocioId, cargandoNegocios, recargarNegocios]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useApp() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useApp fuera de AppProvider');
  return c;
}

/** Negocio activo; solo se usa dentro del panel, donde ya se sabe que existe. */
export function useNegocio() {
  const { negocio } = useApp();
  if (!negocio) throw new Error('Sin negocio activo');
  return { ...negocio, puedeEditar: negocio.rol === 'dueno' || negocio.rol === 'admin' };
}
