export type Rol = 'dueno' | 'admin' | 'vendedor';

export interface Negocio {
  id: string;
  nombre: string;
  moneda: string;
  rol: Rol;
}

export interface Producto {
  id: string;
  negocio_id: string;
  tipo: 'producto' | 'servicio';
  sku: string | null;
  nombre: string;
  descripcion: string | null;
  precio: number;
  costo: number;
  controla_stock: boolean;
  stock_minimo: number;
  activo: boolean;
  stock_actual: number;
}

export interface Cliente {
  id: string;
  negocio_id: string;
  nombre: string;
  documento: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  notas: string | null;
}

export interface MetodoPago {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Venta {
  id: string;
  numero: number;
  subtotal: number;
  descuento: number;
  total: number;
  estado: 'completada' | 'anulada';
  nota: string | null;
  created_at: string;
  clientes: { nombre: string } | null;
  metodos_pago: { nombre: string } | null;
}

export interface VentaItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
}

export interface Movimiento {
  id: string;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'venta' | 'anulacion';
  cantidad: number;
  nota: string | null;
  created_at: string;
  productos: { nombre: string } | null;
}

export interface Suscripcion {
  plan_codigo: string;
  estado: 'prueba' | 'activa' | 'vencida' | 'cancelada';
  prueba_hasta: string;
  proximo_cobro: string | null;
}

export interface Plan {
  codigo: string;
  nombre: string;
  precio_cop: number;
  max_usuarios: number | null;
  max_productos: number | null;
}
