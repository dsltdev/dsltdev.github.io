import { useMemo, useState, type SyntheticEvent } from 'react';
import { supabase, ok } from '../lib/supabase';
import { useNegocio } from '../state';
import type { Cliente } from '../lib/types';
import { opcional } from '../lib/format';
import { AreaTexto, Cabecera, Campo, Cargando, Entrada, ErrorCaja, Modal, Vacio, mensajeError, useAvisos, useCarga } from '../ui';

type Borrador = Omit<Cliente, 'negocio_id' | 'id'> & { id?: string };
const vacio = (): Borrador => ({ nombre: '', documento: '', email: '', telefono: '', direccion: '', notas: '' });

export default function Clientes() {
  const negocio = useNegocio();
  const avisar = useAvisos();
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Borrador | null>(null);
  const { datos, error, cargando, recargar } = useCarga(
    () => ok(supabase.from('clientes').select('*').eq('negocio_id', negocio.id).order('nombre')) as Promise<Cliente[]>,
    [negocio.id]
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (datos ?? []).filter(
      (c) => !q || [c.nombre, c.documento, c.email, c.telefono].some((v) => (v ?? '').toLowerCase().includes(q))
    );
  }, [datos, busqueda]);

  async function guardar(b: Borrador) {
    const fila = {
      negocio_id: negocio.id,
      nombre: b.nombre.trim(),
      documento: opcional(b.documento ?? ''),
      email: opcional(b.email ?? ''),
      telefono: opcional(b.telefono ?? ''),
      direccion: opcional(b.direccion ?? ''),
      notas: opcional(b.notas ?? '')
    };
    try {
      if (b.id) await ok(supabase.from('clientes').update(fila).eq('id', b.id).select('id'));
      else await ok(supabase.from('clientes').insert(fila).select('id'));
      avisar(b.id ? 'Cliente actualizado' : 'Cliente creado');
      setEditando(null);
      recargar();
    } catch (e) {
      avisar(mensajeError(e), true);
    }
  }

  async function borrar(b: Borrador) {
    if (!b.id || !window.confirm(`¿Eliminar a ${b.nombre}? Sus ventas se conservan, sin cliente asignado.`)) return;
    try {
      await ok(supabase.from('clientes').delete().eq('id', b.id).select('id'));
      avisar('Cliente eliminado');
      setEditando(null);
      recargar();
    } catch (e) {
      avisar(mensajeError(e), true);
    }
  }

  return (
    <>
      <Cabecera titulo="Clientes" subtitulo="Tus compradores y sus datos de contacto.">
        <button className="btn btn-pri" onClick={() => setEditando(vacio())}>
          + Nuevo cliente
        </button>
      </Cabecera>

      <div className="barra">
        <input type="search" placeholder="Buscar por nombre, documento, correo o teléfono…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar clientes" />
      </div>

      {cargando && !datos ? (
        <Cargando />
      ) : error ? (
        <ErrorCaja texto={error} reintentar={recargar} />
      ) : filtrados.length === 0 ? (
        <Vacio icono="☺" titulo={busqueda ? 'Nadie coincide con tu búsqueda' : 'Aún no tienes clientes'} texto={busqueda ? undefined : 'Guárdalos para asociarlos a tus ventas.'}>
          {!busqueda && (
            <button className="btn btn-pri" onClick={() => setEditando(vacio())}>
              Agregar cliente
            </button>
          )}
        </Vacio>
      ) : (
        <div className="tabla-caja">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Teléfono</th>
                <th>Correo</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="fila-clic" onClick={() => setEditando(c)}>
                  <td data-et="Nombre"><strong>{c.nombre}</strong></td>
                  <td data-et="Documento">{c.documento ?? '—'}</td>
                  <td data-et="Teléfono">{c.telefono ?? '—'}</td>
                  <td data-et="Correo">{c.email ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && <FormCliente inicial={editando} onGuardar={guardar} onBorrar={borrar} onCerrar={() => setEditando(null)} />}
    </>
  );
}

function FormCliente({
  inicial,
  onGuardar,
  onBorrar,
  onCerrar
}: {
  inicial: Borrador;
  onGuardar: (b: Borrador) => Promise<void>;
  onBorrar: (b: Borrador) => Promise<void>;
  onCerrar: () => void;
}) {
  const [b, setB] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const poner = (k: keyof Borrador) => (e: { target: { value: string } }) => setB((x) => ({ ...x, [k]: e.target.value }));

  async function enviar(e: SyntheticEvent) {
    e.preventDefault();
    setEnviando(true);
    await onGuardar(b);
    setEnviando(false);
  }

  return (
    <Modal titulo={b.id ? 'Editar cliente' : 'Nuevo cliente'} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="form">
        <Campo etiqueta="Nombre">
          <Entrada value={b.nombre} onChange={poner('nombre')} required autoFocus />
        </Campo>
        <div className="fila-2">
          <Campo etiqueta="Documento (CC / NIT)">
            <Entrada value={b.documento ?? ''} onChange={poner('documento')} />
          </Campo>
          <Campo etiqueta="Teléfono">
            <Entrada type="tel" value={b.telefono ?? ''} onChange={poner('telefono')} />
          </Campo>
        </div>
        <Campo etiqueta="Correo">
          <Entrada type="email" value={b.email ?? ''} onChange={poner('email')} />
        </Campo>
        <Campo etiqueta="Dirección">
          <Entrada value={b.direccion ?? ''} onChange={poner('direccion')} />
        </Campo>
        <Campo etiqueta="Notas">
          <AreaTexto value={b.notas ?? ''} onChange={poner('notas')} />
        </Campo>
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
