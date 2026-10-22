import { useMemo, useState } from 'react';
import { supabase, ok } from '../lib/supabase';
import { useApp } from '../state';
import type { Movimiento, Recurrente } from '../lib/types';
import { cop, diasHasta, hoy, mes, verFecha } from '../lib/format';
import { Cabecera, Cargando, ErrorCaja, Vacio, mensajeError, useAvisos, useCarga } from '../ui';
import { SelectorMes } from '../SelectorMes';
import { href } from '../router';

type Fila = Pick<Movimiento, 'tipo' | 'categoria_id' | 'monto' | 'fecha'>;

export default function Resumen() {
  const { cuentas, categorias, session, recargarDatos } = useApp();
  const avisar = useAvisos();
  const [desplazamiento, setDesplazamiento] = useState(0);
  const { desde, hasta } = mes(desplazamiento);

  const { datos, error, cargando, recargar } = useCarga(async () => {
    const [movimientos, recurrentes] = await Promise.all([
      ok(supabase.from('movimientos').select('tipo, categoria_id, monto, fecha').gte('fecha', desde).lt('fecha', hasta).limit(5000)) as Promise<Fila[]>,
      ok(supabase.from('pagos_recurrentes').select('*').eq('activo', true).order('proxima_fecha')) as Promise<Recurrente[]>
    ]);
    return { movimientos, recurrentes };
  }, [desde, hasta]);

  const resumen = useMemo(() => {
    const movs = datos?.movimientos ?? [];
    const ingresos = movs.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    const gastos = movs.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
    const porCategoria = new Map<string | null, number>();
    for (const m of movs) if (m.tipo === 'gasto') porCategoria.set(m.categoria_id, (porCategoria.get(m.categoria_id) ?? 0) + m.monto);
    // Categorías con gasto o con presupuesto, de mayor a menor gasto.
    const filas = categorias
      .filter((c) => c.tipo === 'gasto' && (porCategoria.has(c.id) || c.presupuesto_mensual))
      .map((c) => ({ id: c.id, nombre: c.nombre, gastado: porCategoria.get(c.id) ?? 0, presupuesto: c.presupuesto_mensual }));
    if (porCategoria.has(null)) filas.push({ id: 'sin', nombre: 'Sin categoría', gastado: porCategoria.get(null) ?? 0, presupuesto: null });
    filas.sort((a, b) => b.gastado - a.gastado);
    return { ingresos, gastos, balance: ingresos - gastos, filas };
  }, [datos, categorias]);

  const proximos = (datos?.recurrentes ?? []).filter((r) => diasHasta(r.proxima_fecha) <= r.recordar_dias);
  const activas = cuentas.filter((c) => !c.archivada);
  const total = activas.reduce((s, c) => s + c.saldo, 0);
  const nombre = session?.user.email?.split('@')[0];

  async function pagar(r: Recurrente) {
    try {
      await ok(supabase.rpc('pagar_recurrente', { p_id: r.id, p_fecha: hoy() }));
      await recargarDatos();
      avisar(`Registré «${r.nombre}»`);
      recargar();
    } catch (e) {
      avisar(mensajeError(e), true);
    }
  }

  if (cuentas.length === 0) {
    return (
      <>
        <Cabecera titulo={nombre ? `Hola, ${nombre}` : 'Bienvenido'} subtitulo="Empecemos por tus cuentas." />
        <Vacio icono="◧" titulo="Crea tu primera cuenta" texto="Agrega dónde tienes tu plata (efectivo, Bancolombia, Nequi…) con lo que tienes hoy en cada una.">
          <a className="btn btn-pri" href={href('/cuentas')}>
            Crear cuentas
          </a>
        </Vacio>
      </>
    );
  }

  return (
    <>
      <Cabecera titulo="Resumen" subtitulo={`Saldo total ${cop(total)} en ${activas.length} ${activas.length === 1 ? 'cuenta' : 'cuentas'}`}>
        <SelectorMes valor={desplazamiento} onCambio={setDesplazamiento} />
      </Cabecera>

      {cargando && !datos ? (
        <Cargando />
      ) : error || !datos ? (
        <ErrorCaja texto={error ?? 'No se pudo cargar el resumen.'} reintentar={recargar} />
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <span>Ingresos</span>
              <strong className="pos">{cop(resumen.ingresos)}</strong>
            </div>
            <div className="kpi">
              <span>Gastos</span>
              <strong className="neg">{cop(resumen.gastos)}</strong>
            </div>
            <div className="kpi">
              <span>Balance del mes</span>
              <strong className={resumen.balance < 0 ? 'neg' : 'pos'}>{cop(resumen.balance)}</strong>
            </div>
          </div>

          {proximos.length > 0 && (
            <section className="tarjeta tarjeta-aviso">
              <header>
                <h2>Pagos por hacer</h2>
                <a href={href('/recurrentes')}>Ver todos</a>
              </header>
              <ul className="lista">
                {proximos.map((r) => {
                  const dias = diasHasta(r.proxima_fecha);
                  return (
                    <li key={r.id}>
                      <div>
                        <strong>{r.nombre}</strong> · {cop(r.monto)}
                        <small className={dias < 0 ? 'neg' : 'suave'}>
                          {dias < 0 ? `Vencido hace ${-dias} ${dias === -1 ? 'día' : 'días'}` : dias === 0 ? 'Vence hoy' : `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`} · {verFecha(r.proxima_fecha)}
                        </small>
                      </div>
                      <button className="btn btn-sec" onClick={() => pagar(r)}>
                        Registrar pago
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <div className="dos-col">
            <section className="tarjeta">
              <header>
                <h2>Gastos por categoría</h2>
                <a href={href('/categorias')}>Presupuestos</a>
              </header>
              {resumen.filas.length === 0 ? (
                <p className="suave">No hay gastos este mes.</p>
              ) : (
                <ul className="barras">
                  {resumen.filas.map((f) => {
                    const pasado = f.presupuesto !== null && f.gastado > f.presupuesto;
                    const pct = f.presupuesto ? Math.min(100, (f.gastado / f.presupuesto) * 100) : resumen.gastos > 0 ? (f.gastado / resumen.gastos) * 100 : 0;
                    return (
                      <li key={f.id}>
                        <div className="barra-texto">
                          <span>{f.nombre}</span>
                          <span className={pasado ? 'neg' : undefined}>
                            {cop(f.gastado)}
                            {f.presupuesto !== null && <small className="suave"> de {cop(f.presupuesto)}</small>}
                          </span>
                        </div>
                        <div className="barra-fondo" role="img" aria-label={`${Math.round(pct)}%`}>
                          <div className={`barra-relleno${pasado ? ' barra-pasada' : ''}`} style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="tarjeta">
              <header>
                <h2>Cuentas</h2>
                <a href={href('/cuentas')}>Administrar</a>
              </header>
              <ul className="lista">
                {activas.map((c) => (
                  <li key={c.id}>
                    <span>{c.nombre}</span>
                    <strong className={c.saldo < 0 ? 'neg' : undefined}>{cop(c.saldo)}</strong>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </>
  );
}
