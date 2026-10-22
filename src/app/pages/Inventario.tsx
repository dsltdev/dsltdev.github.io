import { useState, type SyntheticEvent } from 'react';
import { supabase, ok } from '../lib/supabase';
import { useNegocio } from '../state';
import type { Movimiento, Producto } from '../lib/types';
import { num, verFechaHora } from '../lib/format';
import { Cabecera, Campo, Cargando, Entrada, ErrorCaja, Modal, Seleccion, Vacio, aNumero, mensajeError, useAvisos, useCarga } from '../ui';

const TIPO_TEXTO: Record<Movimiento['tipo'], string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
  venta: 'Venta',
  anulacion: 'Venta anulada'
};

export default function Inventario() {
  const negocio = useNegocio();
  const avisar = useAvisos();
  const [mover, setMover] = useState<Producto | null>(null);

  const stock = useCarga(
    () =>
      ok(supabase.from('productos_stock').select('*').eq('negocio_id', negocio.id).eq('controla_stock', true).eq('activo', true).order('nombre')) as Promise<Producto[]>,
    [negocio.id]
  );
  const movs = useCarga(
    () =>
      ok(
        supabase.from('movimientos_inventario').select('id, tipo, cantidad, nota, created_at, productos(nombre)').eq('negocio_id', negocio.id).order('created_at', { ascending: false }).limit(30)
      ) as unknown as Promise<Movimiento[]>,
    [negocio.id]
  );

  const recargar = () => {
    stock.recargar();
    movs.recargar();
  };

  async function guardar(p: Producto, tipo: 'entrada' | 'salida' | 'ajuste', cantidad: number, nota: string) {
    try {
      await ok(supabase.rpc('ajustar_stock', { p_producto: p.id, p_tipo: tipo, p_cantidad: cantidad, p_nota: nota.trim() || null }));
      avisar('Inventario actualizado');
      setMover(null);
      recargar();
    } catch (e) {
      avisar(mensajeError(e), true);
    }
  }

  return (
    <>
      <Cabecera titulo="Inventario" subtitulo="Existencias actuales y cada movimiento que las cambió." />

      {stock.cargando && !stock.datos ? (
        <Cargando />
      ) : stock.error ? (
        <ErrorCaja texto={stock.error} reintentar={stock.recargar} />
      ) : (stock.datos ?? []).length === 0 ? (
        <Vacio icono="▤" titulo="No hay productos con control de stock" texto="Crea un producto y activa «Llevar control de stock» para verlo aquí." />
      ) : (
        <div className="tabla-caja">
          <table className="tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="der">En stock</th>
                <th className="der">Mínimo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(stock.datos ?? []).map((p) => {
                const bajo = p.stock_actual <= p.stock_minimo;
                return (
                  <tr key={p.id}>
                    <td data-et="Producto">
                      <strong>{p.nombre}</strong>
                      {p.sku && <small className="suave">{p.sku}</small>}
                    </td>
                    <td data-et="En stock" className="der">
                      <span className={bajo ? 'etiqueta etiqueta-alerta' : undefined}>{num(p.stock_actual)}</span>
                    </td>
                    <td data-et="Mínimo" className="der">{num(p.stock_minimo)}</td>
                    <td className="der">
                      {negocio.puedeEditar && (
                        <button className="btn btn-sec" onClick={() => setMover(p)}>
                          Mover stock
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="subtitulo">Últimos movimientos</h2>
      {movs.cargando && !movs.datos ? (
        <Cargando />
      ) : movs.error ? (
        <ErrorCaja texto={movs.error} reintentar={movs.recargar} />
      ) : (movs.datos ?? []).length === 0 ? (
        <p className="suave">Todavía no hay movimientos.</p>
      ) : (
        <div className="tabla-caja">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th className="der">Cantidad</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {(movs.datos ?? []).map((m) => (
                <tr key={m.id}>
                  <td data-et="Fecha">{verFechaHora(m.created_at)}</td>
                  <td data-et="Producto">{m.productos?.nombre ?? '—'}</td>
                  <td data-et="Tipo">{TIPO_TEXTO[m.tipo]}</td>
                  <td data-et="Cantidad" className={`der ${m.cantidad < 0 ? 'neg' : 'pos'}`}>
                    {m.cantidad > 0 ? '+' : ''}
                    {num(m.cantidad)}
                  </td>
                  <td data-et="Nota" className="suave">{m.nota ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mover && <FormMovimiento producto={mover} onGuardar={guardar} onCerrar={() => setMover(null)} />}
    </>
  );
}

function FormMovimiento({
  producto,
  onGuardar,
  onCerrar
}: {
  producto: Producto;
  onGuardar: (p: Producto, tipo: 'entrada' | 'salida' | 'ajuste', cantidad: number, nota: string) => Promise<void>;
  onCerrar: () => void;
}) {
  const [tipo, setTipo] = useState<'entrada' | 'salida' | 'ajuste'>('entrada');
  const [cantidad, setCantidad] = useState('');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const valor = aNumero(cantidad);

  async function enviar(e: SyntheticEvent) {
    e.preventDefault();
    if (valor === 0) return;
    setEnviando(true);
    await onGuardar(producto, tipo, valor, nota);
    setEnviando(false);
  }

  return (
    <Modal titulo={`Mover stock · ${producto.nombre}`} onCerrar={onCerrar} ancho={440}>
      <form onSubmit={enviar} className="form">
        <p className="suave">
          Ahora hay <strong>{num(producto.stock_actual)}</strong>.
        </p>
        <Campo etiqueta="Movimiento">
          <Seleccion value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="entrada">Entrada (compra, devolución)</option>
            <option value="salida">Salida (pérdida, uso propio)</option>
            <option value="ajuste">Ajuste de conteo (+ o −)</option>
          </Seleccion>
        </Campo>
        <Campo etiqueta="Cantidad" ayuda={tipo === 'ajuste' ? 'Usa un negativo para restar, por ejemplo -2.' : undefined}>
          <Entrada type="number" inputMode="decimal" step="any" min={tipo === 'ajuste' ? undefined : '0'} value={cantidad} onChange={(e) => setCantidad(e.target.value)} required autoFocus />
        </Campo>
        <Campo etiqueta="Nota">
          <Entrada value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Opcional" />
        </Campo>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn btn-pri" disabled={enviando || valor === 0}>
            {enviando ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
