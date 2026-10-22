import { useMemo, useState, type SyntheticEvent } from 'react';
import { supabase, ok } from '../lib/supabase';
import { useNegocio } from '../state';
import type { Cliente, MetodoPago, Producto, Venta, VentaItem } from '../lib/types';
import { cop, num, verFechaHora } from '../lib/format';
import { Cabecera, Campo, Cargando, Entrada, ErrorCaja, Modal, Seleccion, Vacio, aNumero, mensajeError, useAvisos, useCarga } from '../ui';

export default function Ventas() {
  const negocio = useNegocio();
  const [nueva, setNueva] = useState(false);
  const [detalle, setDetalle] = useState<Venta | null>(null);
  const { datos, error, cargando, recargar } = useCarga(
    () =>
      ok(
        supabase
          .from('ventas')
          .select('id, numero, subtotal, descuento, total, estado, nota, created_at, clientes(nombre), metodos_pago(nombre)')
          .eq('negocio_id', negocio.id)
          .order('numero', { ascending: false })
          .limit(100)
      ) as unknown as Promise<Venta[]>,
    [negocio.id]
  );

  return (
    <>
      <Cabecera titulo="Ventas" subtitulo="Registra una venta y el inventario se descuenta solo.">
        <button className="btn btn-pri" onClick={() => setNueva(true)}>
          + Nueva venta
        </button>
      </Cabecera>

      {cargando && !datos ? (
        <Cargando />
      ) : error ? (
        <ErrorCaja texto={error} reintentar={recargar} />
      ) : (datos ?? []).length === 0 ? (
        <Vacio icono="＄" titulo="Aún no has registrado ventas" texto="Tu primera venta aparecerá aquí.">
          <button className="btn btn-pri" onClick={() => setNueva(true)}>
            Registrar venta
          </button>
        </Vacio>
      ) : (
        <div className="tabla-caja">
          <table className="tabla">
            <thead>
              <tr>
                <th>N.º</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Pago</th>
                <th className="der">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(datos ?? []).map((v) => (
                <tr key={v.id} className="fila-clic" onClick={() => setDetalle(v)}>
                  <td data-et="N.º"><strong>#{v.numero}</strong></td>
                  <td data-et="Fecha">{verFechaHora(v.created_at)}</td>
                  <td data-et="Cliente">{v.clientes?.nombre ?? 'Mostrador'}</td>
                  <td data-et="Pago">{v.metodos_pago?.nombre ?? '—'}</td>
                  <td data-et="Total" className={`der${v.estado === 'anulada' ? ' tachado' : ''}`}>{cop(v.total)}</td>
                  <td data-et="Estado">
                    {v.estado === 'anulada' ? <span className="etiqueta etiqueta-alerta">Anulada</span> : <span className="etiqueta etiqueta-ok">Completada</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nueva && (
        <NuevaVenta
          onCerrar={() => setNueva(false)}
          onListo={() => {
            setNueva(false);
            recargar();
          }}
        />
      )}
      {detalle && (
        <DetalleVenta
          venta={detalle}
          onCerrar={() => setDetalle(null)}
          onCambio={() => {
            setDetalle(null);
            recargar();
          }}
        />
      )}
    </>
  );
}

interface Linea {
  producto: Producto;
  cantidad: string;
  precio: string;
}

function NuevaVenta({ onCerrar, onListo }: { onCerrar: () => void; onListo: () => void }) {
  const negocio = useNegocio();
  const avisar = useAvisos();
  const [busqueda, setBusqueda] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [cliente, setCliente] = useState('');
  const [metodo, setMetodo] = useState('');
  const [descuento, setDescuento] = useState('');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);

  const catalogo = useCarga(async () => {
    const [productos, clientes, metodos] = await Promise.all([
      ok(supabase.from('productos_stock').select('*').eq('negocio_id', negocio.id).eq('activo', true).order('nombre')) as Promise<Producto[]>,
      ok(supabase.from('clientes').select('id, nombre').eq('negocio_id', negocio.id).order('nombre')) as Promise<Pick<Cliente, 'id' | 'nombre'>[]>,
      ok(supabase.from('metodos_pago').select('id, nombre, activo').eq('negocio_id', negocio.id).eq('activo', true).order('nombre')) as Promise<MetodoPago[]>
    ]);
    return { productos, clientes, metodos };
  }, [negocio.id]);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (catalogo.datos?.productos ?? []).filter((p) => !q || p.nombre.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)).slice(0, 8);
  }, [catalogo.datos, busqueda]);

  const subtotal = lineas.reduce((s, l) => s + aNumero(l.cantidad) * aNumero(l.precio), 0);
  const desc = aNumero(descuento);
  const total = subtotal - desc;
  const stockInsuficiente = lineas.some((l) => l.producto.controla_stock && aNumero(l.cantidad) > l.producto.stock_actual);
  const valida = lineas.length > 0 && lineas.every((l) => aNumero(l.cantidad) > 0) && desc >= 0 && desc <= subtotal && !stockInsuficiente;

  const agregar = (p: Producto) => {
    setLineas((ls) => (ls.some((l) => l.producto.id === p.id) ? ls.map((l) => (l.producto.id === p.id ? { ...l, cantidad: String(aNumero(l.cantidad) + 1) } : l)) : [...ls, { producto: p, cantidad: '1', precio: String(p.precio) }]));
    setBusqueda('');
  };
  const cambiar = (id: string, campo: 'cantidad' | 'precio', valor: string) => setLineas((ls) => ls.map((l) => (l.producto.id === id ? { ...l, [campo]: valor } : l)));

  async function enviar(e: SyntheticEvent) {
    e.preventDefault();
    if (!valida) return;
    setEnviando(true);
    try {
      await ok(
        supabase.rpc('registrar_venta', {
          p_negocio: negocio.id,
          p_cliente: cliente || null,
          p_metodo_pago: metodo || null,
          p_descuento: desc,
          p_nota: nota.trim() || null,
          p_items: lineas.map((l) => ({ producto_id: l.producto.id, cantidad: aNumero(l.cantidad), precio_unitario: aNumero(l.precio) }))
        })
      );
      avisar('Venta registrada');
      onListo();
    } catch (err) {
      avisar(mensajeError(err), true);
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Nueva venta" onCerrar={onCerrar} ancho={760}>
      {catalogo.cargando && !catalogo.datos ? (
        <Cargando />
      ) : catalogo.error ? (
        <ErrorCaja texto={catalogo.error} reintentar={catalogo.recargar} />
      ) : (
        <form onSubmit={enviar} className="form">
          <div className="buscador">
            <input type="search" placeholder="Busca un producto por nombre o código…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar producto" autoFocus />
            {busqueda && (
              <ul className="sugerencias">
                {resultados.length === 0 && <li className="suave">Sin resultados</li>}
                {resultados.map((p) => {
                  const agotado = p.controla_stock && p.stock_actual <= 0;
                  return (
                    <li key={p.id}>
                      <button type="button" disabled={agotado} onClick={() => agregar(p)}>
                        <span>{p.nombre}</span>
                        <span className="suave">
                          {cop(p.precio)} · {p.controla_stock ? (agotado ? 'agotado' : `${num(p.stock_actual)} disp.`) : 'servicio'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {lineas.length === 0 ? (
            <p className="suave centro">Agrega productos para empezar.</p>
          ) : (
            <div className="tabla-caja">
              <table className="tabla tabla-lineas">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="der">Cant.</th>
                    <th className="der">Precio</th>
                    <th className="der">Subtotal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l) => {
                    const exceso = l.producto.controla_stock && aNumero(l.cantidad) > l.producto.stock_actual;
                    return (
                      <tr key={l.producto.id}>
                        <td>
                          {l.producto.nombre}
                          {exceso && <small className="msg-error">Solo hay {num(l.producto.stock_actual)}</small>}
                        </td>
                        <td className="der">
                          <input className="mini" type="number" inputMode="decimal" min="0" step="any" value={l.cantidad} onChange={(e) => cambiar(l.producto.id, 'cantidad', e.target.value)} aria-label={`Cantidad de ${l.producto.nombre}`} />
                        </td>
                        <td className="der">
                          <input className="mini ancho" type="number" inputMode="decimal" min="0" step="any" value={l.precio} onChange={(e) => cambiar(l.producto.id, 'precio', e.target.value)} aria-label={`Precio de ${l.producto.nombre}`} />
                        </td>
                        <td className="der">{cop(aNumero(l.cantidad) * aNumero(l.precio))}</td>
                        <td className="der">
                          <button type="button" className="btn-icono" onClick={() => setLineas((ls) => ls.filter((x) => x.producto.id !== l.producto.id))} aria-label={`Quitar ${l.producto.nombre}`}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="fila-3">
            <Campo etiqueta="Cliente">
              <Seleccion value={cliente} onChange={(e) => setCliente(e.target.value)}>
                <option value="">Mostrador (sin cliente)</option>
                {catalogo.datos?.clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Seleccion>
            </Campo>
            <Campo etiqueta="Método de pago">
              <Seleccion value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                <option value="">Sin especificar</option>
                {catalogo.datos?.metodos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </Seleccion>
            </Campo>
            <Campo etiqueta="Descuento (COP)">
              <Entrada type="number" inputMode="decimal" min="0" step="any" value={descuento} onChange={(e) => setDescuento(e.target.value)} />
            </Campo>
          </div>
          <Campo etiqueta="Nota">
            <Entrada value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Opcional" />
          </Campo>

          <div className="totales">
            <span>Subtotal {cop(subtotal)}</span>
            {desc > 0 && <span>Descuento −{cop(desc)}</span>}
            <strong>Total {cop(Math.max(total, 0))}</strong>
          </div>
          {desc > subtotal && <p className="msg-error">El descuento no puede superar el subtotal.</p>}

          <div className="modal-pie">
            <button type="button" className="btn btn-sec" onClick={onCerrar}>
              Cancelar
            </button>
            <button className="btn btn-pri" disabled={!valida || enviando}>
              {enviando ? 'Registrando…' : 'Registrar venta'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function DetalleVenta({ venta, onCerrar, onCambio }: { venta: Venta; onCerrar: () => void; onCambio: () => void }) {
  const negocio = useNegocio();
  const avisar = useAvisos();
  const [anulando, setAnulando] = useState(false);
  const { datos, error, cargando, recargar } = useCarga(
    () => ok(supabase.from('venta_items').select('id, descripcion, cantidad, precio_unitario, total').eq('venta_id', venta.id).order('descripcion')) as Promise<VentaItem[]>,
    [venta.id]
  );

  async function anular() {
    if (!window.confirm(`¿Anular la venta #${venta.numero}? El stock vuelve al inventario.`)) return;
    setAnulando(true);
    try {
      await ok(supabase.rpc('anular_venta', { p_venta: venta.id }));
      avisar('Venta anulada');
      onCambio();
    } catch (e) {
      avisar(mensajeError(e), true);
      setAnulando(false);
    }
  }

  return (
    <Modal titulo={`Venta #${venta.numero}`} onCerrar={onCerrar} ancho={620}>
      <dl className="datos">
        <div><dt>Fecha</dt><dd>{verFechaHora(venta.created_at)}</dd></div>
        <div><dt>Cliente</dt><dd>{venta.clientes?.nombre ?? 'Mostrador'}</dd></div>
        <div><dt>Pago</dt><dd>{venta.metodos_pago?.nombre ?? '—'}</dd></div>
        <div><dt>Estado</dt><dd>{venta.estado === 'anulada' ? 'Anulada' : 'Completada'}</dd></div>
      </dl>
      {cargando ? (
        <Cargando />
      ) : error ? (
        <ErrorCaja texto={error} reintentar={recargar} />
      ) : (
        <div className="tabla-caja">
          <table className="tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="der">Cant.</th>
                <th className="der">Precio</th>
                <th className="der">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(datos ?? []).map((i) => (
                <tr key={i.id}>
                  <td>{i.descripcion}</td>
                  <td className="der">{num(i.cantidad)}</td>
                  <td className="der">{cop(i.precio_unitario)}</td>
                  <td className="der">{cop(i.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="totales">
        <span>Subtotal {cop(venta.subtotal)}</span>
        {venta.descuento > 0 && <span>Descuento −{cop(venta.descuento)}</span>}
        <strong>Total {cop(venta.total)}</strong>
      </div>
      {venta.nota && <p className="suave">Nota: {venta.nota}</p>}
      <div className="modal-pie">
        {negocio.puedeEditar && venta.estado === 'completada' && (
          <button className="btn btn-peligro izq" onClick={anular} disabled={anulando}>
            {anulando ? 'Anulando…' : 'Anular venta'}
          </button>
        )}
        <button className="btn btn-sec" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
