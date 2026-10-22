import { useMemo, useState, type SyntheticEvent } from 'react';
import { supabase, ok } from '../lib/supabase';
import { useNegocio } from '../state';
import type { Producto } from '../lib/types';
import { cop, num, opcional } from '../lib/format';
import { AreaTexto, Cabecera, Campo, Cargando, Entrada, ErrorCaja, Modal, Seleccion, Vacio, aNumero, mensajeError, useAvisos, useCarga } from '../ui';

interface Borrador {
  id?: string;
  tipo: 'producto' | 'servicio';
  nombre: string;
  sku: string;
  descripcion: string;
  precio: string;
  costo: string;
  controla_stock: boolean;
  stock_minimo: string;
  activo: boolean;
}

const nuevo = (): Borrador => ({
  tipo: 'producto',
  nombre: '',
  sku: '',
  descripcion: '',
  precio: '',
  costo: '',
  controla_stock: true,
  stock_minimo: '0',
  activo: true
});

const desde = (p: Producto): Borrador => ({
  id: p.id,
  tipo: p.tipo,
  nombre: p.nombre,
  sku: p.sku ?? '',
  descripcion: p.descripcion ?? '',
  precio: String(p.precio),
  costo: String(p.costo),
  controla_stock: p.controla_stock,
  stock_minimo: String(p.stock_minimo),
  activo: p.activo
});

export default function Productos() {
  const negocio = useNegocio();
  const avisar = useAvisos();
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Borrador | null>(null);
  const { datos, error, cargando, recargar } = useCarga(
    () => ok(supabase.from('productos_stock').select('*').eq('negocio_id', negocio.id).order('nombre')) as Promise<Producto[]>,
    [negocio.id]
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (datos ?? []).filter((p) => !q || p.nombre.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q));
  }, [datos, busqueda]);

  async function guardar(b: Borrador) {
    const fila = {
      negocio_id: negocio.id,
      tipo: b.tipo,
      nombre: b.nombre.trim(),
      sku: opcional(b.sku),
      descripcion: opcional(b.descripcion),
      precio: aNumero(b.precio),
      costo: aNumero(b.costo),
      controla_stock: b.tipo === 'producto' && b.controla_stock,
      stock_minimo: aNumero(b.stock_minimo),
      activo: b.activo
    };
    try {
      if (b.id) await ok(supabase.from('productos').update(fila).eq('id', b.id).select('id'));
      else await ok(supabase.from('productos').insert(fila).select('id'));
      avisar(b.id ? 'Producto actualizado' : 'Producto creado');
      setEditando(null);
      recargar();
    } catch (e) {
      const m = mensajeError(e);
      avisar(m.includes('productos_negocio_id_sku_key') ? 'Ya tienes otro producto con ese código (SKU).' : m, true);
    }
  }

  return (
    <>
      <Cabecera titulo="Productos y servicios" subtitulo="Lo que vendes, con su precio y su stock.">
        {negocio.puedeEditar && (
          <button className="btn btn-pri" onClick={() => setEditando(nuevo())}>
            + Nuevo
          </button>
        )}
      </Cabecera>

      <div className="barra">
        <input type="search" placeholder="Buscar por nombre o código…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar productos" />
      </div>

      {cargando && !datos ? (
        <Cargando />
      ) : error ? (
        <ErrorCaja texto={error} reintentar={recargar} />
      ) : filtrados.length === 0 ? (
        <Vacio icono="▣" titulo={busqueda ? 'Nada coincide con tu búsqueda' : 'Aún no tienes productos'} texto={busqueda ? undefined : 'Crea el primero para poder venderlo.'}>
          {!busqueda && negocio.puedeEditar && (
            <button className="btn btn-pri" onClick={() => setEditando(nuevo())}>
              Crear producto
            </button>
          )}
        </Vacio>
      ) : (
        <div className="tabla-caja">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Código</th>
                <th className="der">Precio</th>
                <th className="der">Stock</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => {
                const bajo = p.controla_stock && p.stock_actual <= p.stock_minimo;
                return (
                  <tr key={p.id} className={negocio.puedeEditar ? 'fila-clic' : undefined} onClick={() => negocio.puedeEditar && setEditando(desde(p))}>
                    <td data-et="Nombre">
                      <strong>{p.nombre}</strong>
                      <small className="suave">{p.tipo === 'servicio' ? 'Servicio' : 'Producto'}</small>
                    </td>
                    <td data-et="Código">{p.sku ?? '—'}</td>
                    <td data-et="Precio" className="der">{cop(p.precio)}</td>
                    <td data-et="Stock" className="der">
                      {p.controla_stock ? <span className={bajo ? 'etiqueta etiqueta-alerta' : undefined}>{num(p.stock_actual)}</span> : '—'}
                    </td>
                    <td data-et="Estado">{p.activo ? <span className="etiqueta etiqueta-ok">Activo</span> : <span className="etiqueta">Inactivo</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editando && <FormProducto inicial={editando} onGuardar={guardar} onCerrar={() => setEditando(null)} />}
    </>
  );
}

function FormProducto({ inicial, onGuardar, onCerrar }: { inicial: Borrador; onGuardar: (b: Borrador) => Promise<void>; onCerrar: () => void }) {
  const [b, setB] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const cambiar = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB((x) => ({ ...x, [k]: v }));

  async function enviar(e: SyntheticEvent) {
    e.preventDefault();
    setEnviando(true);
    await onGuardar(b);
    setEnviando(false);
  }

  return (
    <Modal titulo={b.id ? 'Editar' : 'Nuevo producto o servicio'} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="form">
        <div className="fila-2">
          <Campo etiqueta="Tipo">
            <Seleccion value={b.tipo} onChange={(e) => cambiar('tipo', e.target.value as Borrador['tipo'])}>
              <option value="producto">Producto</option>
              <option value="servicio">Servicio</option>
            </Seleccion>
          </Campo>
          <Campo etiqueta="Código (SKU)" ayuda="Opcional, no se repite.">
            <Entrada value={b.sku} onChange={(e) => cambiar('sku', e.target.value)} />
          </Campo>
        </div>
        <Campo etiqueta="Nombre">
          <Entrada value={b.nombre} onChange={(e) => cambiar('nombre', e.target.value)} required autoFocus />
        </Campo>
        <Campo etiqueta="Descripción">
          <AreaTexto value={b.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} />
        </Campo>
        <div className="fila-2">
          <Campo etiqueta="Precio de venta (COP)">
            <Entrada type="number" inputMode="decimal" min="0" step="any" value={b.precio} onChange={(e) => cambiar('precio', e.target.value)} required />
          </Campo>
          <Campo etiqueta="Costo (COP)">
            <Entrada type="number" inputMode="decimal" min="0" step="any" value={b.costo} onChange={(e) => cambiar('costo', e.target.value)} />
          </Campo>
        </div>
        {b.tipo === 'producto' && (
          <>
            <label className="casilla">
              <input type="checkbox" checked={b.controla_stock} onChange={(e) => cambiar('controla_stock', e.target.checked)} />
              Llevar control de stock
            </label>
            {b.controla_stock && (
              <Campo etiqueta="Avisar cuando queden" ayuda="Unidades o menos. El stock se carga en Inventario.">
                <Entrada type="number" inputMode="decimal" min="0" step="any" value={b.stock_minimo} onChange={(e) => cambiar('stock_minimo', e.target.value)} />
              </Campo>
            )}
          </>
        )}
        <label className="casilla">
          <input type="checkbox" checked={b.activo} onChange={(e) => cambiar('activo', e.target.checked)} />
          Activo (aparece al vender)
        </label>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn btn-pri" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
