// Datos compartidos por las páginas públicas (privacidad y términos).
import { OFERTA } from './oferta';

export const PLATAFORMA = {
  nombre: 'dsltdev',
  titulo: 'Mis finanzas',
  descripcion: 'Aplicación personal y privada para llevar el control de gastos, pagos y transferencias.',
  url: 'https://dsltdev.com',
  email: OFERTA.email
} as const;
