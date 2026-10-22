import { useMemo, useState } from 'react';
import { supabase, ok } from '../lib/supabase';
import { useApp } from '../state';
import type { Movimiento } from '../lib/types';
import { cop, mes, verDia } from '../lib/format';
import { Cabecera, Cargando, ErrorCaja, Seleccion, Vacio, useCarga } from '../ui';
import { SelectorMes } from '../SelectorMes';
import { MovimientoForm } from '../MovimientoForm';

export default function Movimientos() {
  const { cuentas, categorias } = useApp();
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [tipo, setTipo] = useState('');
  const [cuenta, setCuenta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Movimiento | null>(null);
  const { desde, hasta } = mes(desplazamiento);

  const { datos, error, cargando, recargar } = useCarga(
    () => ok(supabase.from('movimientos').select('*').gte('fecha', desde).lt('fecha', hasta).order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(2000)) as Promise<Movimiento[]>,
    [desde, hasta]
  );

  const nombreCuenta = (id: string | null) => cuentas.find((c) => c.id === id)?.nombre ?? '—';
  const nombreCategoria = (id: string | null) => categorias.find((c) => c.id === id)?.nombre ?? null;

  const { grupos, ingresos, gastos } = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = (datos ?? []).filter(
      (m) =>
        (!tipo || m.tipo === tipo) &&
        (!cuenta || m.cuenta_id === cuenta || m.cuenta_destino_id === cuenta) &&
        (!q || (m.nota ?? '').toLowerCase().includes(q) || (nombreCategoria(m.categoria_id) ?? '').toLowerCase().includes(q))
    );
    const porDia = new Map<string, Movimiento[]>();
    for (const m of filtrados) porDia.set(m.fecha, [...(porDia.get(m.fecha) ?? []), m]);
    return {
      grupos: [...porDia.entries()],
      ingresos: filtrados.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0),
      gastos: filtrados.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, tipo, cuenta, busqueda, categorias]);

  return (
    <>
      <Cabecera titulo="Movimientos" subtitulo="Todo lo que entra, sale y se mueve entre tus cuentas.">
        <SelectorMes valor={desplazamiento} onCambio={setDesplazamiento} />
      </Cabecera>

      <div className="filtros">
        <input type="search" placeholder="Buscar nota o categoría…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar movimientos" />
        <Seleccion value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          <option value="gasto">Gastos</option>
          <option value="ingreso">Ingresos</option>
          <option value="transferencia">Transferencias</option>
        </Seleccion>
        <Seleccion value={cuenta} onChange={(e) => setCuenta(e.target.value)} aria-label="Filtrar por cuenta">
          <option value="">Todas las cuentas</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Seleccion>
      </div>

      {cargando && !datos ? (
        <Cargando />
      ) : error ? (
        <ErrorCaja texto={error} reintentar={recargar} />
      ) : grupos.length === 0 ? (
        <Vacio icono="▤" titulo="No hay movimientos" texto={busqueda || tipo || cuenta ? 'Prueba con otros filtros.' : 'Este mes no has registrado nada. Usa el botón + para agregar el primero.'} />
      ) : (
        <>
          <p className="suave resumen-filtro">
            {ingresos > 0 && <span className="pos">+{cop(ingresos)}</span>} {gastos > 0 && <span className="neg">−{cop(gastos)}</span>}
          </p>
          {grupos.map(([fecha, movs]) => (
            <section key={fecha} className="dia">
              <h2>{verDia(fecha)}</h2>
              <ul className="movs">
                {movs.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => setEditando(m)}>
                      <span className="mov-texto">
                        <strong>{m.nota ?? nombreCategoria(m.categoria_id) ?? (m.tipo === 'transferencia' ? 'Transferencia' : m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto')}</strong>
                        <small className="suave">
                          {m.tipo === 'transferencia' ? `${nombreCuenta(m.cuenta_id)} → ${nombreCuenta(m.cuenta_destino_id)}` : [nombreCategoria(m.categoria_id), nombreCuenta(m.cuenta_id)].filter(Boolean).join(' · ')}
                        </small>
                      </span>
                      <span className={`mov-monto mov-${m.tipo}`}>
                        {m.tipo === 'ingreso' ? '+' : m.tipo === 'gasto' ? '−' : ''}
                        {cop(m.monto)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      {editando && (
        <MovimientoForm
          movimiento={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            recargar();
          }}
        />
      )}
    </>
  );
}
