import { useState, type SyntheticEvent } from 'react';
import { supabase, ok } from '../lib/supabase';
import { useApp } from '../state';
import type { TipoCuenta } from '../lib/types';
import { TIPOS_CUENTA, cop } from '../lib/format';
import { Cabecera, Campo, Entrada, Modal, Seleccion, Vacio, aNumero, mensajeError, useAvisos } from '../ui';

interface Borrador {
  id?: string;
  nombre: string;
  tipo: TipoCuenta;
  saldo_inicial: string;
  archivada: boolean;
}

const nueva = (): Borrador => ({ nombre: '', tipo: 'banco', saldo_inicial: '', archivada: false });

export default function Cuentas() {
  const { cuentas, recargarDatos } = useApp();
  const avisar = useAvisos();
  const [editando, setEditando] = useState<Borrador | null>(null);
  const [verArchivadas, setVerArchivadas] = useState(false);

  const visibles = cuentas.filter((c) => verArchivadas || !c.archivada);
  const total = cuentas.filter((c) => !c.archivada).reduce((s, c) => s + c.saldo, 0);
  const hayArchivadas = cuentas.some((c) => c.archivada);

  async function guardar(b: Borrador) {
    const fila = { nombre: b.nombre.trim(), tipo: b.tipo, saldo_inicial: aNumero(b.saldo_inicial), archivada: b.archivada };
    try {
      if (b.id) await ok(supabase.from('cuentas').update(fila).eq('id', b.id).select('id'));
      else await ok(supabase.from('cuentas').insert(fila).select('id'));
      await recargarDatos();
      avisar(b.id ? 'Cuenta actualizada' : 'Cuenta creada');
      setEditando(null);
    } catch (e) {
      const m = mensajeError(e);
      avisar(m.includes('cuentas_user_id_nombre_key') ? 'Ya tienes una cuenta con ese nombre.' : m, true);
    }
  }

  async function borrar(b: Borrador) {
    if (!b.id || !window.confirm(`¿Eliminar la cuenta «${b.nombre}»?`)) return;
    try {
      await ok(supabase.from('cuentas').delete().eq('id', b.id).select('id'));
      await recargarDatos();
      avisar('Cuenta eliminada');
      setEditando(null);
    } catch (e) {
      const m = mensajeError(e);
      avisar(m.includes('violates foreign key') ? 'Esa cuenta tiene movimientos. Mejor archívala: deja de aparecer pero conserva tu historial.' : m, true);
    }
  }

  return (
    <>
      <Cabecera titulo="Cuentas" subtitulo={cuentas.length > 0 ? `Saldo total ${cop(total)}` : 'Dónde tienes tu plata.'}>
        <button className="btn btn-pri" onClick={() => setEditando(nueva())}>
          + Nueva cuenta
        </button>
      </Cabecera>

      {cuentas.length === 0 ? (
        <Vacio icono="◧" titulo="Aún no tienes cuentas" texto="Crea una por cada lugar donde guardas plata: efectivo, Bancolombia, Nequi, una tarjeta…">
          <button className="btn btn-pri" onClick={() => setEditando(nueva())}>
            Crear mi primera cuenta
          </button>
        </Vacio>
      ) : (
        <>
          <div className="cuentas">
            {visibles.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cuenta${c.archivada ? ' cuenta-archivada' : ''}`}
                onClick={() => setEditando({ id: c.id, nombre: c.nombre, tipo: c.tipo, saldo_inicial: String(c.saldo_inicial), archivada: c.archivada })}
              >
                <span className="suave">{TIPOS_CUENTA[c.tipo].split(' (')[0]}{c.archivada ? ' · archivada' : ''}</span>
                <strong>{c.nombre}</strong>
                <span className={`cuenta-saldo${c.saldo < 0 ? ' neg' : ''}`}>{cop(c.saldo)}</span>
              </button>
            ))}
          </div>
          {hayArchivadas && (
            <label className="casilla suave">
              <input type="checkbox" checked={verArchivadas} onChange={(e) => setVerArchivadas(e.target.checked)} />
              Mostrar cuentas archivadas
            </label>
          )}
        </>
      )}

      {editando && <FormCuenta inicial={editando} onGuardar={guardar} onBorrar={borrar} onCerrar={() => setEditando(null)} />}
    </>
  );
}

function FormCuenta({ inicial, onGuardar, onBorrar, onCerrar }: { inicial: Borrador; onGuardar: (b: Borrador) => Promise<void>; onBorrar: (b: Borrador) => Promise<void>; onCerrar: () => void }) {
  const [b, setB] = useState(inicial);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: SyntheticEvent) {
    e.preventDefault();
    setEnviando(true);
    await onGuardar(b);
    setEnviando(false);
  }

  return (
    <Modal titulo={b.id ? 'Editar cuenta' : 'Nueva cuenta'} onCerrar={onCerrar} ancho={440}>
      <form onSubmit={enviar} className="form">
        <Campo etiqueta="Nombre">
          <Entrada value={b.nombre} onChange={(e) => setB({ ...b, nombre: e.target.value })} placeholder="Bancolombia, Nequi, Efectivo…" required maxLength={60} autoFocus />
        </Campo>
        <Campo etiqueta="Tipo">
          <Seleccion value={b.tipo} onChange={(e) => setB({ ...b, tipo: e.target.value as TipoCuenta })}>
            {Object.entries(TIPOS_CUENTA).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </Seleccion>
        </Campo>
        <Campo etiqueta="Saldo inicial (COP)" ayuda={b.tipo === 'tarjeta' ? 'Lo que debes hoy, en negativo (por ejemplo -350000).' : 'Lo que tienes hoy en esta cuenta. Después se actualiza solo con tus movimientos.'}>
          <Entrada type="number" inputMode="decimal" step="any" value={b.saldo_inicial} onChange={(e) => setB({ ...b, saldo_inicial: e.target.value })} placeholder="0" />
        </Campo>
        {b.id && (
          <label className="casilla">
            <input type="checkbox" checked={b.archivada} onChange={(e) => setB({ ...b, archivada: e.target.checked })} />
            Archivada (no aparece al registrar movimientos ni en el saldo total)
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
