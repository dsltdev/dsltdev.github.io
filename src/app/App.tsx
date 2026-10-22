import { useState } from 'react';
import { AppProvider, useApp } from './state';
import { AvisosProvider, Cargando } from './ui';
import { href, useRuta } from './router';
import { Auth, CrearNegocio, NuevaClave } from './Auth';
import { ROLES } from './lib/format';
import Resumen from './pages/Resumen';
import Ventas from './pages/Ventas';
import Productos from './pages/Productos';
import Inventario from './pages/Inventario';
import Clientes from './pages/Clientes';
import Ajustes from './pages/Ajustes';

const MENU = [
  { ruta: '/', texto: 'Resumen', icono: '◧' },
  { ruta: '/ventas', texto: 'Ventas', icono: '＄' },
  { ruta: '/productos', texto: 'Productos', icono: '▣' },
  { ruta: '/inventario', texto: 'Inventario', icono: '▤' },
  { ruta: '/clientes', texto: 'Clientes', icono: '☺' },
  { ruta: '/ajustes', texto: 'Ajustes', icono: '⚙' }
];

function Pagina({ ruta }: { ruta: string }) {
  switch (ruta) {
    case '/ventas':
      return <Ventas />;
    case '/productos':
      return <Productos />;
    case '/inventario':
      return <Inventario />;
    case '/clientes':
      return <Clientes />;
    case '/ajustes':
      return <Ajustes />;
    default:
      return <Resumen />;
  }
}

function Panel() {
  const { negocio, negocios, elegirNegocio, cerrarSesion, session } = useApp();
  const ruta = useRuta();
  const [creando, setCreando] = useState(false);
  if (!negocio) return null;
  if (creando) return <CrearNegocio onVolver={() => setCreando(false)} />;

  return (
    <div className="panel">
      <aside className="lateral">
        <a className="marca" href="/">
          <span className="marca-punto" aria-hidden="true" />
          dsltdev
        </a>
        <label className="selector-negocio">
          <span className="sr">Negocio activo</span>
          <select
            value={negocio.id}
            onChange={(e) => (e.target.value === '__nuevo' ? setCreando(true) : elegirNegocio(e.target.value))}
          >
            {negocios.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre}
              </option>
            ))}
            <option value="__nuevo">+ Nuevo negocio</option>
          </select>
        </label>
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
            <strong>{session?.user.user_metadata?.nombre || session?.user.email}</strong>
            <small>{ROLES[negocio.rol]}</small>
          </div>
          <button type="button" className="btn btn-sec" onClick={cerrarSesion}>
            Salir
          </button>
        </div>
      </aside>
      <main className="contenido" key={negocio.id}>
        <Pagina ruta={ruta} />
      </main>
    </div>
  );
}

function Raiz() {
  const { session, listo, recuperando, negocio, cargandoNegocios } = useApp();
  if (!listo) return <Cargando />;
  if (recuperando) return <NuevaClave />;
  if (!session) return <Auth />;
  if (cargandoNegocios && !negocio) return <Cargando texto="Cargando tu negocio…" />;
  if (!negocio) return <CrearNegocio />;
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
