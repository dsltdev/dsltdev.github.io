import { supabase, ok } from '../lib/supabase';
import { useApp, useNegocio } from '../state';
import type { Producto, Venta } from '../lib/types';
import { cop, num, verFechaHora } from '../lib/format';
import { Cabecera, Cargando, ErrorCaja, useCarga } from '../ui';
import { href } from '../router';

export default function Resumen() {
  const negocio = useNegocio();
  const { session } = useApp();
  const { datos, error, cargando, recargar } = useCarga(async () => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const [ventas, productos, clientes, ultimas] = await Promise.all([
      ok(supabase.from('ventas').select('total, created_at').eq('negocio_id', negocio.id).eq('estado', 'completada').gte('created_at', inicioMes.toISOString())) as Promise<{ total: number; created_at: string }[]>,
      ok(supabase.from('productos_stock').select('*').eq('negocio_id', negocio.id).eq('activo', true).eq('controla_stock', true)) as Promise<Producto[]>,
      supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('negocio_id', negocio.id),
      ok(
        supabase.from('ventas').select('id, numero, total, estado, created_at, clientes(nombre)').eq('negocio_id', negocio.id).order('numero', { ascending: false }).limit(5)
      ) as unknown as Promise<Venta[]>
    ]);
    const hoy = ventas.filter((v) => new Date(v.created_at) >= inicioDia);
    return {
      ventasHoy: hoy.reduce((s, v) => s + v.total, 0),
      cantidadHoy: hoy.length,
      ventasMes: ventas.reduce((s, v) => s + v.total, 0),
      cantidadMes: ventas.length,
      stockBajo: productos.filter((p) => p.stock_actual <= p.stock_minimo),
      clientes: clientes.count ?? 0,
      ultimas
    };
  }, [negocio.id]);

  const saludo = session?.user.user_metadata?.nombre?.split(' ')[0];

  return (
    <>
      <Cabecera titulo={saludo ? `Hola, ${saludo}` : 'Resumen'} subtitulo={negocio.nombre} />
      {cargando && !datos ? (
        <Cargando />
      ) : error || !datos ? (
        <ErrorCaja texto={error ?? 'No se pudo cargar el resumen.'} reintentar={recargar} />
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <span>Ventas de hoy</span>
              <strong>{cop(datos.ventasHoy)}</strong>
              <small>{datos.cantidadHoy} {datos.cantidadHoy === 1 ? 'venta' : 'ventas'}</small>
            </div>
            <div className="kpi">
              <span>Ventas del mes</span>
              <strong>{cop(datos.ventasMes)}</strong>
              <small>{datos.cantidadMes} {datos.cantidadMes === 1 ? 'venta' : 'ventas'}</small>
            </div>
            <div className="kpi">
              <span>Stock bajo</span>
              <strong>{datos.stockBajo.length}</strong>
              <small>{datos.stockBajo.length === 1 ? 'producto por reponer' : 'productos por reponer'}</small>
            </div>
            <div className="kpi">
              <span>Clientes</span>
              <strong>{datos.clientes}</strong>
              <small>registrados</small>
            </div>
          </div>

          <div className="dos-col">
            <section className="tarjeta">
              <header>
                <h2>Últimas ventas</h2>
                <a href={href('/ventas')}>Ver todas</a>
              </header>
              {datos.ultimas.length === 0 ? (
                <p className="suave">Todavía no hay ventas.</p>
              ) : (
                <ul className="lista">
                  {datos.ultimas.map((v) => (
                    <li key={v.id}>
                      <div>
                        <strong>#{v.numero}</strong> · {v.clientes?.nombre ?? 'Mostrador'}
                        <small className="suave">{verFechaHora(v.created_at)}</small>
                      </div>
                      <span className={v.estado === 'anulada' ? 'tachado' : undefined}>{cop(v.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="tarjeta">
              <header>
                <h2>Por reponer</h2>
                <a href={href('/inventario')}>Inventario</a>
              </header>
              {datos.stockBajo.length === 0 ? (
                <p className="suave">Todo tu stock está por encima del mínimo.</p>
              ) : (
                <ul className="lista">
                  {datos.stockBajo.slice(0, 6).map((p) => (
                    <li key={p.id}>
                      <div>{p.nombre}</div>
                      <span className="etiqueta etiqueta-alerta">
                        {num(p.stock_actual)} / mín. {num(p.stock_minimo)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
