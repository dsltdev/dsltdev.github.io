export type TipoMovimiento = 'gasto' | 'ingreso' | 'transferencia';
export type TipoCategoria = 'gasto' | 'ingreso';
export type TipoCuenta = 'efectivo' | 'banco' | 'billetera' | 'tarjeta';
export type Frecuencia = 'semanal' | 'mensual' | 'anual';

export interface Cuenta {
  id: string;
  nombre: string;
  tipo: TipoCuenta;
  saldo_inicial: number;
  archivada: boolean;
  /** Saldo actual: saldo inicial + ingresos − gastos ± transferencias. */
  saldo: number;
}

export interface Categoria {
  id: string;
  nombre: string;
  tipo: TipoCategoria;
  presupuesto_mensual: number | null;
}

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  cuenta_id: string;
  cuenta_destino_id: string | null;
  categoria_id: string | null;
  monto: number;
  /** AAAA-MM-DD */
  fecha: string;
  nota: string | null;
  recurrente_id: string | null;
}

export interface Recurrente {
  id: string;
  nombre: string;
  tipo: TipoCategoria;
  monto: number;
  cuenta_id: string;
  categoria_id: string | null;
  frecuencia: Frecuencia;
  proxima_fecha: string;
  recordar_dias: number;
  activo: boolean;
}
