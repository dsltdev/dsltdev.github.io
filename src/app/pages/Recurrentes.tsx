import { useState, type SyntheticEvent } from 'react';
import { supabase, ok } from '../lib/supabase';
import { useApp } from '../state';
import type { Frecuencia, Recurrente, TipoCategoria } from '../lib/types';
import { FRECUENCIAS, cop, diasHasta, hoy, verFecha } from '../lib/format';
import { Cabecera, Campo, Cargando, Entrada, ErrorCaja, Modal, Seleccion, Vacio, aNumero, mensajeError, useAvisos, useCarga } from '../ui';

interface Borrador {
  id?: string;
  nombre: string;
  tipo: TipoCategoria;
  monto: string;
  cuenta_id: string;
  categoria_id: string;
  frecuencia: Frecuencia;
  proxima_fecha: string;
  recordar_dias: string;
  activo: boolean;
}

export default function Recurrentes() {
  const { cuentas, recargarDatos } = useApp();
  const avisar = useAvisos();
  const [editando, setEditando] = useState<Borrador | null>(null);
  const { datos, error, cargando, recargar } = useCarga(
    () => ok(supabase.from('pagos_recurrentes').select('*').order('activo', { ascending: false }).order('proxima_fecha')) as Promise<Recurrente[]>,
    []
  );

  const nombreCuenta = (id: string) => cuentas.find((c) => c.id === id)?.nombre ?? '—';
  const nuevo = (): Borrador => ({ nombre: '', tipo: 'gasto', monto: '', cuenta_id: cuentas.find((c) => !c.archivada)?.id ?? '', categoria_id: '', frecuencia: 'mensual', proxima_fecha: hoy(), recordar_dias: '3', activo: true });

  async function guardar(b: Borrador) {
    const fila = {
      nombre: b.nombre.trim(),
      tipo: b.tipo,
      monto: aNumero(b.monto),
      cuenta_id: b.cuenta_id,
      categoria_id: b.categoria_id || null,
      frecuencia: b.frecuencia,
      proxima_fecha: b.proxima_fecha,
      recordar_dias: Math.round(aNumero(b.recordar_dias)),
      activo: b.activo
    };
    try {
      if (b.id) await ok(supabase.from('pagos_recurrentes').update(fila).eq('id', b.id).select('id'));
      else await ok(supabase.from('pagos_recurrentes').insert(fila).select('id'));
      avisar(b.id ? 'Pago recurrente actualizado' : 'Pago recurrente creado');
      setEditando(null);
      recargar();
    } catch (e) {
      avisar(mensajeError(e), true);
    }
  }

  async function borrar(b: Borrador) {
    if (!b.id || !window.confirm(`¿Eliminar «${b.nombre}»? Los movimientos que ya registraste se conservan.`)) return;
    try {
      await ok(supabase.from('pagos_recurrentes').delete().eq('id', b.id).select('id'));
      avisar('Pago recurrente eliminado');
      setEditando(null);
      recargar();
    } catch (e) {
      avisar(mensajeError(e), true);
    }
  }

  async function pagar(r: Recurrente) {
    try {
      await ok(supabase.rpc('pagar_recurrente', { p_id: r.id, p_fecha: hoy() }));
      await recargarDatos();
      avisar(`Registré «${r.nombre}» y avancé la próxima fecha`);
      recargar();
    } catch (e) {
      avisar(mensajeError(e), true);
    }
  }

  return (
    <>
      <Cabecera titulo="Pagos recurrentes" subtitulo="Arriendo, servicios, suscripciones y todo lo que se repite.">
        <button className="btn btn-pri" onClick={() => setEditando(nuevo())} disabled={cuentas.length === 0}>
          + Nuevo
        </button>
      </Cabecera>

      {cuentas.length === 0 ? (
        <Vacio icono="↻" titulo="Primero crea una cuenta" texto="Cada pago recurrente se descuenta de una de tus cuentas." />
      ) : cargando && !datos ? (
        <Cargando />
      ) : error ? (
        <ErrorCaja texto={error} reintentar={recargar} />
      ) : (datos ?? []).length === 0 ? (
        <Vacio icono="↻" titulo="No tienes pagos recurrentes" texto="Agrégalos para que la app te recuerde cuándo vencen y los registre con un clic.">
          <button className="btn btn-pri" onClick={() => setEditando(nuevo())}>
            Agregar el primero
          </button>
        </Vacio>
      ) : (
        <div className="tabla-caja">
          <ul className="recurrentes">
            {(datos ?? []).map((r) => {
              const dias = diasHasta(r.proxima_fecha);
              const vencido = r.activo && dias < 0;
              return (
                <li key={r.id} className={r.activo ? undefined : 'inactivo'}>
                  <button
                    type="button"
                    className="rec-info"
                    onClick={() => setEditando({ id: r.id, nombre: r.nombre, tipo: r.tipo, monto: String(r.monto), cuenta_id: r.cuenta_id, categoria_id: r.categoria_id ?? '', frecuencia: r.frecuencia, proxima_fecha: r.proxima_fecha, recordar_dias: String(r.recordar_dias), activo: r.activo })}
                  >
                    <strong>{r.nombre}</strong>
                    <small className="suave">
                      {FRECUENCIAS[r.frecuencia]} · {nombreCuenta(r.cuenta_id)}
                      {!r.activo && ' · pausado'}
                    </small>
                  </button>
                  <span className="rec-monto">
                    <strong className={r.tipo === 'ingreso' ? 'pos' : undefined}>{cop(r.monto)}</strong>
                    <small className={vencido ? 'neg' : 'suave'}>{r.activo ? (vencido ? `Vencido hace ${-dias} ${dias === -1 ? 'día' : 'días'}` : dias === 0 ? 'Hoy' : `${verFecha(r.proxima_fecha)}`) : '—'}</small>
                  </span>
                  {r.activo && (
                    <button className="btn btn-sec" onClick={() => pagar(r)}>
                      {r.tipo === 'ingreso' ? 'Recibido' : 'Pagado'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {editando && <FormRecurrente inicial={editando} onGuardar={guardar} onBorrar={borrar} onCerrar={() => setEditando(null)} />}
    </>
  );
}

function FormRecurrente({ inicial, onGuardar, onBorrar, onCerrar }: { inicial: Borrador; onGuardar: (b: Borrador) => Promise<void>; onBorrar: (b: Borrador) => Promise<void>; onCerrar: () => void }) {
  const { cuentas, categorias } = useApp();
  const [b, setB] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const poner = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB((x) => ({ ...x, [k]: v }));

  async function enviar(e: SyntheticEvent) {
    e.preventDefault();
    setEnviando(true);
    await onGuardar(b);
    setEnviando(false);
  }

  return (
    <Modal titulo={b.id ? 'Editar pago recurrente' : 'Nuevo pago recurrente'} onCerrar={onCerrar} ancho={480}>
      <form onSubmit={enviar} className="form">
        <Campo etiqueta="Nombre">
          <Entrada value={b.nombre} onChange={(e) => poner('nombre', e.target.value)} placeholder="Arriendo, Netflix, Internet…" required maxLength={80} autoFocus />
        </Campo>
        <div className="fila-2">
          <Campo etiqueta="Tipo">
            <Seleccion value={b.tipo} onChange={(e) => setB({ ...b, tipo: e.target.value as TipoCategoria, categoria_id: '' })}>
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso (salario…)</option>
            </Seleccion>
          </Campo>
          <Campo etiqueta="Monto (COP)">
            <Entrada type="number" inputMode="decimal" min="0" step="any" value={b.monto} onChange={(e) => poner('monto', e.target.value)} required />
          </Campo>
        </div>
        <div className="fila-2">
          <Campo etiqueta="Cuenta">
            <Seleccion value={b.cuenta_id} onChange={(e) => poner('cuenta_id', e.target.value)} required>
              {cuentas
                .filter((c) => !c.archivada || c.id === b.cuenta_id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </Seleccion>
          </Campo>
          <Campo etiqueta="Categoría">
            <Seleccion value={b.categoria_id} onChange={(e) => poner('categoria_id', e.target.value)}>
              <option value="">Sin categoría</option>
              {categorias
                .filter((c) => c.tipo === b.tipo)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </Seleccion>
          </Campo>
        </div>
        <div className="fila-2">
          <Campo etiqueta="Se repite">
            <Seleccion value={b.frecuencia} onChange={(e) => poner('frecuencia', e.target.value as Frecuencia)}>
              {Object.entries(FRECUENCIAS).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </Seleccion>
          </Campo>
          <Campo etiqueta="Próxima fecha">
            <Entrada type="date" value={b.proxima_fecha} onChange={(e) => poner('proxima_fecha', e.target.value)} required />
          </Campo>
        </div>
        <Campo etiqueta="Recordarme (días antes)" ayuda="Aparece en el resumen cuando falten estos días o menos.">
          <Entrada type="number" inputMode="numeric" min="0" max="30" value={b.recordar_dias} onChange={(e) => poner('recordar_dias', e.target.value)} />
        </Campo>
        {b.id && (
          <label className="casilla">
            <input type="checkbox" checked={b.activo} onChange={(e) => poner('activo', e.target.checked)} />
            Activo (si lo pausas, no te lo recordará)
          </label>
        )}
        <div className="modal-pie">
          {b.id && (
            <button type="button" className="btn btn-peligro izq" onClick={() => onBorrar(b)}>
              Eliminar
            </button>
          )}
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
