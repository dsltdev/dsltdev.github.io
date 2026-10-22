import { useState, type SyntheticEvent } from 'react';
import { supabase, ok } from '../lib/supabase';
import { useApp, useNegocio } from '../state';
import type { Plan, Suscripcion } from '../lib/types';
import { ROLES, cop, verFecha } from '../lib/format';
import { Cabecera, Campo, Cargando, Entrada, ErrorCaja, mensajeError, useAvisos, useCarga } from '../ui';

const ESTADO: Record<Suscripcion['estado'], string> = {
  prueba: 'En prueba',
  activa: 'Activa',
  vencida: 'Vencida',
  cancelada: 'Cancelada'
};

export default function Ajustes() {
  const negocio = useNegocio();
  const { recargarNegocios } = useApp();
  const avisar = useAvisos();
  const [nombre, setNombre] = useState(negocio.nombre);
  const [guardando, setGuardando] = useState(false);

  const { datos, error, cargando, recargar } = useCarga(async () => {
    const [suscripcion, planes, miembros] = await Promise.all([
      ok(supabase.from('suscripciones').select('plan_codigo, estado, prueba_hasta, proximo_cobro').eq('negocio_id', negocio.id).maybeSingle()) as Promise<Suscripcion | null>,
      ok(supabase.from('planes').select('*').order('orden')) as Promise<Plan[]>,
      ok(supabase.from('miembros').select('rol').eq('negocio_id', negocio.id)) as Promise<{ rol: string }[]>
    ]);
    return { suscripcion, planes, miembros };
  }, [negocio.id]);

  async function guardar(e: SyntheticEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await ok(supabase.from('negocios').update({ nombre: nombre.trim() }).eq('id', negocio.id).select('id'));
      await recargarNegocios(negocio.id);
      avisar('Nombre actualizado');
    } catch (err) {
      avisar(mensajeError(err), true);
    } finally {
      setGuardando(false);
    }
  }

  const sus = datos?.suscripcion;
  const plan = datos?.planes.find((p) => p.codigo === sus?.plan_codigo);

  return (
    <>
      <Cabecera titulo="Ajustes" subtitulo="Tu negocio, tu equipo y tu plan." />

      <section className="tarjeta">
        <header>
          <h2>Negocio</h2>
        </header>
        <form onSubmit={guardar} className="form form-corto">
          <Campo etiqueta="Nombre del negocio">
            <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={2} maxLength={80} disabled={!negocio.puedeEditar} />
          </Campo>
          {negocio.puedeEditar ? (
            <div>
              <button className="btn btn-pri" disabled={guardando || nombre.trim() === negocio.nombre}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          ) : (
            <p className="suave">Solo el dueño o un administrador puede cambiarlo.</p>
          )}
        </form>
      </section>

      {cargando && !datos ? (
        <Cargando />
      ) : error || !datos ? (
        <ErrorCaja texto={error ?? 'No se pudo cargar.'} reintentar={recargar} />
      ) : (
        <>
          <section className="tarjeta">
            <header>
              <h2>Suscripción</h2>
            </header>
            {sus ? (
              <p>
                Plan <strong>{plan?.nombre ?? sus.plan_codigo}</strong> · {ESTADO[sus.estado]}
                {sus.estado === 'prueba' && <> hasta el {verFecha(sus.prueba_hasta)}</>}
                {sus.estado === 'activa' && sus.proximo_cobro && <> · próximo cobro el {verFecha(sus.proximo_cobro)}</>}
              </p>
            ) : (
              <p className="suave">Este negocio no tiene suscripción.</p>
            )}
            <div className="planes">
              {datos.planes.map((p) => (
                <div key={p.codigo} className={`plan${p.codigo === sus?.plan_codigo ? ' plan-actual' : ''}`}>
                  <h3>{p.nombre}</h3>
                  <strong>
                    {cop(p.precio_cop)}
                    <small>/mes</small>
                  </strong>
                  <ul>
                    <li>{p.max_usuarios ? `Hasta ${p.max_usuarios} usuarios` : 'Usuarios ilimitados'}</li>
                    <li>{p.max_productos ? `Hasta ${p.max_productos} productos` : 'Productos ilimitados'}</li>
                  </ul>
                </div>
              ))}
            </div>
            <p className="suave">El pago en línea de la suscripción se activará pronto; mientras tanto tu prueba sigue corriendo.</p>
          </section>

          <section className="tarjeta">
            <header>
              <h2>Equipo</h2>
            </header>
            <p>
              {datos.miembros.length} {datos.miembros.length === 1 ? 'persona' : 'personas'} en este negocio. Tu rol: <strong>{ROLES[negocio.rol]}</strong>.
            </p>
            <p className="suave">Invitar a más personas estará disponible en la siguiente versión.</p>
          </section>
        </>
      )}
    </>
  );
}
