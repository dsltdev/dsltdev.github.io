import { createClient, type PostgrestError } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

/** false si el sitio se compiló sin backend (por ejemplo, un despliegue de prueba): el panel avisa en vez de fallar. */
export const configurado = Boolean(url && key);

if (!configurado) {
  console.warn('Faltan PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY (copia .env.example a .env).');
}

export const supabase = createClient(url ?? 'http://localhost:8000', key ?? 'sin-clave', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

/** Devuelve los datos o lanza un Error con el mensaje de Postgres, para usar con try/catch. */
export async function ok<T>(consulta: PromiseLike<{ data: T | null; error: PostgrestError | null }>): Promise<T> {
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return data as T;
}
