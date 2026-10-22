import { useState, type SyntheticEvent } from 'react';
import { supabase } from './lib/supabase';
import { useApp } from './state';
import { Campo, Entrada, mensajeError } from './ui';

type Modo = 'entrar' | 'registro' | 'olvide';

function Marco({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <main className="auth">
      <div className="auth-tarjeta">
        <a className="marca" href="/">
          <span className="marca-punto" aria-hidden="true" />
          dsltdev
        </a>
        <h1>{titulo}</h1>
        <p className="auth-sub">{subtitulo}</p>
        {children}
      </div>
    </main>
  );
}

export function Auth() {
  const [modo, setModo] = useState<Modo>('entrar');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (m: Modo) => {
    setModo(m);
    setError(null);
    setInfo(null);
  };

  async function enviar(e: SyntheticEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setEnviando(true);
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: clave });
        if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message);
      } else if (modo === 'registro') {
        const { data, error } = await supabase.auth.signUp({ email, password: clave, options: { data: { nombre: nombre.trim() } } });
        if (error) {
          // El registro se cierra en la base de datos después de la primera cuenta; GoTrue lo muestra como error genérico.
          throw new Error(/database error saving new user/i.test(error.message) ? 'El registro está cerrado: esta aplicación es privada.' : error.message);
        }
        // Con confirmación por correo activada no hay sesión todavía.
        if (!data.session) setInfo('Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve a entrar.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/app/` });
        if (error) throw new Error(error.message);
        setInfo('Si el correo existe, te enviamos un enlace para crear una contraseña nueva.');
      }
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  }

  const titulos: Record<Modo, [string, string]> = {
    entrar: ['Entrar a tus finanzas', 'Tus gastos, cuentas y pagos en un solo lugar.'],
    registro: ['Crea tu cuenta', 'App privada: el registro se cierra con la primera cuenta.'],
    olvide: ['Recuperar contraseña', 'Te enviamos un enlace al correo.']
  };

  return (
    <Marco titulo={titulos[modo][0]} subtitulo={titulos[modo][1]}>
      <form onSubmit={enviar} className="form">
        {modo === 'registro' && (
          <Campo etiqueta="Tu nombre">
            <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} required autoComplete="name" />
          </Campo>
        )}
        <Campo etiqueta="Correo">
          <Entrada type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Campo>
        {modo !== 'olvide' && (
          <Campo etiqueta="Contraseña" ayuda={modo === 'registro' ? 'Mínimo 8 caracteres.' : undefined}>
            <Entrada
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              required
              minLength={modo === 'registro' ? 8 : undefined}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            />
          </Campo>
        )}
        {error && (
          <p className="msg-error" role="alert">
            {error}
          </p>
        )}
        {info && <p className="msg-info">{info}</p>}
        <button className="btn btn-pri btn-bloque" disabled={enviando}>
          {enviando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : modo === 'registro' ? 'Crear cuenta' : 'Enviar enlace'}
        </button>
      </form>
      <div className="auth-pie">
        {modo === 'entrar' && (
          <>
            <button type="button" className="enlace" onClick={() => cambiar('olvide')}>
              Olvidé mi contraseña
            </button>
            <button type="button" className="enlace" onClick={() => cambiar('registro')}>
              Crear cuenta
            </button>
          </>
        )}
        {modo !== 'entrar' && (
          <button type="button" className="enlace" onClick={() => cambiar('entrar')}>
            Ya tengo cuenta
          </button>
        )}
      </div>
    </Marco>
  );
}

export function NuevaClave() {
  const { terminarRecuperacion } = useApp();
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: SyntheticEvent) {
    e.preventDefault();
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: clave });
    setEnviando(false);
    if (error) setError(error.message);
    else terminarRecuperacion();
  }

  return (
    <Marco titulo="Nueva contraseña" subtitulo="Elige una contraseña que no uses en otro sitio.">
      <form onSubmit={enviar} className="form">
        <Campo etiqueta="Contraseña nueva" ayuda="Mínimo 8 caracteres.">
          <Entrada type="password" value={clave} onChange={(e) => setClave(e.target.value)} required minLength={8} autoComplete="new-password" />
        </Campo>
        {error && (
          <p className="msg-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-pri btn-bloque" disabled={enviando}>
          Guardar y entrar
        </button>
      </form>
    </Marco>
  );
}
