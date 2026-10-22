import { useMemo, useState, type SyntheticEvent } from 'react';
import { supabase, ok } from '../lib/supabase';
import { useApp } from '../state';
import type { TipoCategoria } from '../lib/types';
import { cop, mes } from '../lib/format';
import { Cabecera, Campo, Entrada, Modal, Seleccion, aNumero, mensajeError, useAvisos, useCarga } from '../ui';

interface Borrador {
  id?: string;
  nombre: string;
  tipo: TipoCategoria;
  presupuesto: string;
}

export default function Categorias() {
  const { categorias, recargarDatos } = useApp();
  const avisar = useAvisos();
  const [editando, setEditando] = useState<Borrador | null>(null);
  const { desde, hasta } = mes(0);

  const gastos = useCarga(
    () => ok(supabase.from('movimientos').select('categoria_id, monto').eq('tipo', 'gasto').gte('fecha', desde).lt('fecha', hasta).limit(5000)) as Promise<{ categoria_id: string | null; monto: number }[]>,
    [desde, hasta]
  );
  const gastadoPor = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of gastos.datos ?? []) if (g.categoria_id) m.set(g.categoria_id, (m.get(g.categoria_id) ?? 0) + g.monto);
    return m;
  }, [gastos.datos]);

  async function guardar(b: Borrador) {
    const presupuesto = aNumero(b.presupuesto);
    const fila = { nombre: b.nombre.trim(), tipo: b.tipo, presupuesto_mensual: b.tipo === 'gasto' && presupuesto > 0 ? presupuesto : null };
    try {
      if (b.id) await ok(supabase.from('categorias').update(fila).eq('id', b.id).select('id'));
      else await ok(supabase.from('categorias').insert(fila).select('id'));
      await recargarDatos();
      avisar(b.id ? 'Categoría actualizada' : 'Categoría creada');
      setEditando(null);
    } catch (e) {
      const m = mensajeError(e);
      avisar(m.includes('categorias_user_id_tipo_nombre_key') ? 'Ya tienes una categoría con ese nombre.' : m, true);
    }
  }

  async function borrar(b: Borrador) {
    if (!b.id || !window.confirm(`¿Eliminar «${b.nombre}»? Sus movimientos se conservan, sin categoría.`)) return;
    try {
      await ok(supabase.from('categorias').delete().eq('id', b.id).select('id'));
      await recargarDatos();
      gastos.recargar();
      avisar('Categoría eliminada');
      setEditando(null);
    } catch (e) {
      avisar(mensajeError(e), true);
    }
  }

  const grupo = (tipo: TipoCategoria, titulo: string) => (
    <section className="tarjeta">
      <header>
        <h2>{titulo}</h2>
        <button className="enlace" onClick={() => setEditando({ nombre: '', tipo, presupuesto: '' })}>
          + Agregar
        </button>
      </header>
      <ul className="lista">
        {categorias
          .filter((c) => c.tipo === tipo)
          .map((c) => {
            const gastado = gastadoPor.get(c.id) ?? 0;
            const pasado = c.presupuesto_mensual !== null && gastado > c.presupuesto_mensual;
            return (
              <li key={c.id}>
                <button type="button" className="fila-boton" onClick={() => setEditando({ id: c.id, nombre: c.nombre, tipo: c.tipo, presupuesto: c.presupuesto_mensual ? String(c.presupuesto_mensual) : '' })}>
                  <span>{c.nombre}</span>
                  {tipo === 'gasto' && (
                    <span className={pasado ? 'neg' : 'suave'}>
                      {c.presupuesto_mensual !== null ? `${cop(gastado)} de ${cop(c.presupuesto_mensual)}` : gastado > 0 ? cop(gastado) : 'Sin presupuesto'}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
      </ul>
    </section>
  );

  return (
    <>
      <Cabecera titulo="Categorías y presupuestos" subtitulo="Ponle un límite mensual a lo que quieras controlar." />
      <div className="dos-col">
        {grupo('gasto', 'Gastos')}
        {grupo('ingreso', 'Ingresos')}
      </div>
      {editando && <FormCategoria inicial={editando} onGuardar={guardar} onBorrar={borrar} onCerrar={() => setEditando(null)} />}
    </>
  );
}

function FormCategoria({ inicial, onGuardar, onBorrar, onCerrar }: { inicial: Borrador; onGuardar: (b: Borrador) => Promise<void>; onBorrar: (b: Borrador) => Promise<void>; onCerrar: () => void }) {
  const [b, setB] = useState(inicial);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: SyntheticEvent) {
    e.preventDefault();
    setEnviando(true);
    await onGuardar(b);
    setEnviando(false);
  }

  return (
    <Modal titulo={b.id ? 'Editar categoría' : 'Nueva categoría'} onCerrar={onCerrar} ancho={420}>
      <form onSubmit={enviar} className="form">
        <Campo etiqueta="Nombre">
          <Entrada value={b.nombre} onChange={(e) => setB({ ...b, nombre: e.target.value })} required maxLength={60} autoFocus />
        </Campo>
        {!b.id && (
          <Campo etiqueta="Tipo">
            <Seleccion value={b.tipo} onChange={(e) => setB({ ...b, tipo: e.target.value as TipoCategoria })}>
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
            </Seleccion>
          </Campo>
        )}
        {b.tipo === 'gasto' && (
          <Campo etiqueta="Presupuesto mensual (COP)" ayuda="Opcional. Verás cuánto llevas gastado del límite.">
            <Entrada type="number" inputMode="decimal" min="0" step="any" value={b.presupuesto} onChange={(e) => setB({ ...b, presupuesto: e.target.value })} placeholder="Sin límite" />
          </Campo>
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
