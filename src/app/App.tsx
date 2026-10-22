import { useState } from 'react';
import { AppProvider, useApp } from './state';
import { AvisosProvider, Cargando, ErrorCaja } from './ui';
import { href, useRuta } from './router';
import { Auth, NuevaClave } from './Auth';
import { configurado } from './lib/supabase';
import { MovimientoForm } from './MovimientoForm';
import Resumen from './pages/Resumen';
import Movimientos from './pages/Movimientos';
import Cuentas from './pages/Cuentas';
import Categorias from './pages/Categorias';
import Recurrentes from './pages/Recurrentes';
import Ajustes from './pages/Ajustes';

const MENU = [
  { ruta: '/', texto: 'Resumen', icono: '◧' },
  { ruta: '/movimientos', texto: 'Movimientos', icono: '⇅' },
  { ruta: '/cuentas', texto: 'Cuentas', icono: '▣' },
  { ruta: '/categorias', texto: 'Categorías', icono: '◔' },
  { ruta: '/recurrentes', texto: 'Recurrentes', icono: '↻' },
  { ruta: '/ajustes', texto: 'Ajustes', icono: '⚙' }
];

function Pagina({ ruta }: { ruta: string }) {
  switch (ruta) {
    case '/movimientos':
      return <Movimientos />;
    case '/cuentas':
      return <Cuentas />;
    case '/categorias':
      return <Categorias />;
    case '/recurrentes':
      return <Recurrentes />;
    case '/ajustes':
      return <Ajustes />;
    default:
      return <Resumen />;
  }
}

function Panel() {
  const { session, cerrarSesion, cuentas } = useApp();
  const ruta = useRuta();
  const [nuevo, setNuevo] = useState(false);
  // Al guardar un movimiento se vuelve a montar la página actual para que lea los datos nuevos.
  const [version, setVersion] = useState(0);

  return (
    <div className="panel">
      <aside className="lateral">
        <a className="marca" href={href('/')}>
          <span className="marca-punto" aria-hidden="true" />
          Mis finanzas
        </a>
        <nav aria-label="Principal">
          {MENU.map((m) => (
            <a key={m.ruta} href={href(m.ruta)} className={ruta === m.ruta ? 'activo' : undefined} aria-current={ruta === m.ruta ? 'page' : undefined}>
              <span aria-hidden="true">{m.icono}</span>
              {m.texto}
            </a>
          ))}
        </nav>
        <div className="lateral-pie">
          <div className="usuario">
            <strong>{session?.user.email}</strong>
          </div>
          <button type="button" className="btn btn-sec" onClick={cerrarSesion}>
            Salir
          </button>
        </div>
      </aside>

      <main className="contenido" key={`${ruta}-${version}`}>
        <Pagina ruta={ruta} />
      </main>

      {cuentas.length > 0 && (
        <button type="button" className="fab" onClick={() => setNuevo(true)} aria-label="Nuevo movimiento">
          <span aria-hidden="true">+</span>
          <span className="fab-texto">Nuevo movimiento</span>
        </button>
      )}
      {nuevo && (
        <MovimientoForm
          onCerrar={() => setNuevo(false)}
          onGuardado={() => {
            setNuevo(false);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

function NoDisponible() {
  return (
    <main className="auth">
      <div className="auth-tarjeta">
        <span className="marca">
          <span className="marca-punto" aria-hidden="true" />
          Mis finanzas
        </span>
        <h1>Aún no está conectada</h1>
        <p className="auth-sub">Falta conectar la base de datos de esta aplicación.</p>
      </div>
    </main>
  );
}

function Raiz() {
  const { session, listo, recuperando, cuentas, cargandoDatos, errorDatos, recargarDatos } = useApp();
  if (!configurado) return <NoDisponible />;
  if (!listo) return <Cargando />;
  if (recuperando) return <NuevaClave />;
  if (!session) return <Auth />;
  if (errorDatos && cuentas.length === 0) {
    return (
      <main className="auth">
        <div className="auth-tarjeta">
          <h1>No pude cargar tus datos</h1>
          <ErrorCaja texto={errorDatos} reintentar={() => void recargarDatos()} />
        </div>
      </main>
    );
  }
  if (cargandoDatos && cuentas.length === 0) return <Cargando texto="Cargando tus finanzas…" />;
  return <Panel />;
}

export default function App() {
  return (
    <AppProvider>
      <AvisosProvider>
        <Raiz />
      </AvisosProvider>
    </AppProvider>
  );
}
