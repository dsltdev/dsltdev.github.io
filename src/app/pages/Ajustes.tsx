import { useState } from 'react';
import { supabase, ok } from '../lib/supabase';
import { useApp } from '../state';
import type { Movimiento } from '../lib/types';
import { Cabecera, mensajeError, useAvisos } from '../ui';

// Una celda de CSV entre comillas; evita que un texto con coma o salto de línea rompa las columnas.
const celda = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function Ajustes() {
  const { session, cuentas, categorias, cerrarSesion } = useApp();
  const avisar = useAvisos();
  const [exportando, setExportando] = useState(false);

  async function exportar() {
    setExportando(true);
    try {
      const movs = (await ok(supabase.from('movimientos').select('*').order('fecha', { ascending: false }).limit(100000))) as Movimiento[];
      const cuenta = (id: string | null) => cuentas.find((c) => c.id === id)?.nombre ?? '';
      const categoria = (id: string | null) => categorias.find((c) => c.id === id)?.nombre ?? '';
      const filas = [
        ['Fecha', 'Tipo', 'Monto', 'Cuenta', 'Cuenta destino', 'Categoría', 'Nota'],
        ...movs.map((m) => [m.fecha, m.tipo, m.monto, cuenta(m.cuenta_id), cuenta(m.cuenta_destino_id), categoria(m.categoria_id), m.nota])
      ];
      // El BOM hace que Excel lea bien las tildes.
      const csv = '﻿' + filas.map((f) => f.map(celda).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `movimientos-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      avisar(`Exporté ${movs.length} ${movs.length === 1 ? 'movimiento' : 'movimientos'}`);
    } catch (e) {
      avisar(mensajeError(e), true);
    } finally {
      setExportando(false);
    }
  }

  return (
    <>
      <Cabecera titulo="Ajustes" subtitulo="Tu cuenta y tus datos." />

      <section className="tarjeta">
        <header>
          <h2>Cuenta</h2>
        </header>
        <p>
          Sesión iniciada como <strong>{session?.user.email}</strong>.
        </p>
        <div>
          <button className="btn btn-sec" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </section>

      <section className="tarjeta">
        <header>
          <h2>Tus datos</h2>
        </header>
        <p className="suave">Descarga todos tus movimientos en un archivo CSV que abre Excel o Google Sheets.</p>
        <div>
          <button className="btn btn-pri" onClick={exportar} disabled={exportando}>
            {exportando ? 'Preparando…' : 'Exportar movimientos (CSV)'}
          </button>
        </div>
      </section>
    </>
  );
}
