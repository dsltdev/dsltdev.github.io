import { useMemo, useState, type SyntheticEvent } from 'react';
import { supabase, ok } from './lib/supabase';
import { useApp } from './state';
import type { Movimiento, TipoMovimiento } from './lib/types';
import { hoy, opcional } from './lib/format';
import { AreaTexto, Campo, Entrada, Modal, Seleccion, aNumero, mensajeError, useAvisos } from './ui';

const TIPOS: { valor: TipoMovimiento; texto: string }[] = [
  { valor: 'gasto', texto: 'Gasto' },
  { valor: 'ingreso', texto: 'Ingreso' },
  { valor: 'transferencia', texto: 'Transferencia' }
];

interface Props {
  /** Movimiento a editar; sin él, se crea uno nuevo. */
  movimiento?: Movimiento;
  tipoInicial?: TipoMovimiento;
  onCerrar: () => void;
  onGuardado: () => void;
}

export function MovimientoForm({ movimiento, tipoInicial = 'gasto', onCerrar, onGuardado }: Props) {
  const { cuentas, categorias, recargarDatos } = useApp();
  const avisar = useAvisos();
  const activas = useMemo(() => cuentas.filter((c) => !c.archivada || c.id === movimiento?.cuenta_id || c.id === movimiento?.cuenta_destino_id), [cuentas, movimiento]);

  const [tipo, setTipo] = useState<TipoMovimiento>(movimiento?.tipo ?? tipoInicial);
  const [monto, setMonto] = useState(movimiento ? String(movimiento.monto) : '');
  const [fecha, setFecha] = useState(movimiento?.fecha ?? hoy());
  const [cuenta, setCuenta] = useState(movimiento?.cuenta_id ?? activas[0]?.id ?? '');
  const [destino, setDestino] = useState(movimiento?.cuenta_destino_id ?? activas.find((c) => c.id !== (movimiento?.cuenta_id ?? activas[0]?.id))?.id ?? '');
  const [categoria, setCategoria] = useState(movimiento?.categoria_id ?? '');
  const [nota, setNota] = useState(movimiento?.nota ?? '');
  const [enviando, setEnviando] = useState(false);

  const categoriasDelTipo = categorias.filter((c) => c.tipo === (tipo === 'ingreso' ? 'ingreso' : 'gasto'));
  const valor = aNumero(monto);
  const esTransferencia = tipo === 'transferencia';
  const valido = valor > 0 && cuenta !== '' && (!esTransferencia || (destino !== '' && destino !== cuenta));

  async function enviar(e: SyntheticEvent) {
    e.preventDefault();
    if (!valido) return;
    setEnviando(true);
    const fila = {
      tipo,
      cuenta_id: cuenta,
      cuenta_destino_id: esTransferencia ? destino : null,
      categoria_id: esTransferencia || categoria === '' ? null : categoria,
      monto: valor,
      fecha,
      nota: opcional(nota)
    };
    try {
      if (movimiento) await ok(supabase.from('movimientos').update(fila).eq('id', movimiento.id).select('id'));
      else await ok(supabase.from('movimientos').insert(fila).select('id'));
      await recargarDatos();
      avisar(movimiento ? 'Movimiento actualizado' : 'Movimiento guardado');
      onGuardado();
    } catch (err) {
      avisar(mensajeError(err), true);
      setEnviando(false);
    }
  }

  async function borrar() {
    if (!movimiento || !window.confirm('¿Eliminar este movimiento? El saldo de la cuenta se recalcula.')) return;
    setEnviando(true);
    try {
      await ok(supabase.from('movimientos').delete().eq('id', movimiento.id).select('id'));
      await recargarDatos();
      avisar('Movimiento eliminado');
      onGuardado();
    } catch (err) {
      avisar(mensajeError(err), true);
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={movimiento ? 'Editar movimiento' : 'Nuevo movimiento'} onCerrar={onCerrar} ancho={460}>
      <form onSubmit={enviar} className="form">
        <div className="segmentos" role="radiogroup" aria-label="Tipo de movimiento">
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              type="button"
              role="radio"
              aria-checked={tipo === t.valor}
              className={`segmento segmento-${t.valor}${tipo === t.valor ? ' activo' : ''}`}
              onClick={() => {
                setTipo(t.valor);
                setCategoria('');
              }}
            >
              {t.texto}
            </button>
          ))}
        </div>

        <Campo etiqueta="Monto (COP)">
          <Entrada
            className="monto-grande"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0"
            required
            autoFocus
          />
        </Campo>

        <div className="fila-2">
          <Campo etiqueta={esTransferencia ? 'Sale de' : 'Cuenta'}>
            <Seleccion value={cuenta} onChange={(e) => setCuenta(e.target.value)} required>
              {activas.length === 0 && <option value="">Crea una cuenta primero</option>}
              {activas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Seleccion>
          </Campo>
          {esTransferencia ? (
            <Campo etiqueta="Llega a">
              <Seleccion value={destino} onChange={(e) => setDestino(e.target.value)} required>
                <option value="">Elige la cuenta</option>
                {activas
                  .filter((c) => c.id !== cuenta)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </Seleccion>
            </Campo>
          ) : (
            <Campo etiqueta="Categoría">
              <Seleccion value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Sin categoría</option>
                {categoriasDelTipo.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Seleccion>
            </Campo>
          )}
        </div>

        <Campo etiqueta="Fecha">
          <Entrada type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </Campo>
        <Campo etiqueta="Nota">
          <AreaTexto value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Opcional" rows={2} />
        </Campo>

        <div className="modal-pie">
          {movimiento && (
            <button type="button" className="btn btn-peligro izq" onClick={borrar} disabled={enviando}>
              Eliminar
            </button>
          )}
          <button type="button" className="btn btn-sec" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn btn-pri" disabled={!valido || enviando}>
            {enviando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
