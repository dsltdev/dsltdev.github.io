# 🏦 Mi Banco Personal

Dashboard financiero 3D construido con Next.js, React Three Fiber y Tailwind CSS.

## ✨ Características

- **Hero 3D Animado**: Tarjeta de crédito flotante con animaciones suaves
- **Dashboard Completo**: Visualización de balance total, ingresos, gastos y transacciones
- **Gráficos Interactivos**: Comparativa de ingresos vs gastos con Recharts
- **Gestión de Presupuestos**: Seguimiento de gastos por categoría
- **Múltiples Cuentas**: Soporte para diferentes tipos de cuentas (corriente, ahorros, crypto)
- **Diseño Moderno**: UI oscura con gradientes vibrantes y efectos glassmorphism
- **100% Responsive**: Optimizado para mobile, tablet y desktop

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + TypeScript
- **Estilos**: Tailwind CSS
- **3D**: React Three Fiber + Three.js + Drei
- **Gráficos**: Recharts
- **Iconos**: Lucide React
- **Animaciones**: Framer Motion

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build para producción
npm run build

# Iniciar servidor de producción
npm start
```

## 📊 Datos

Los datos actualmente son mock data para demostración. Para conectar datos reales, puedes integrar:

- **Plaid** / **Belvo** / **Finerio** para agregación bancaria
- **API de Bancolombia** para transacciones en tiempo real
- **Binance API** para tracking de crypto
- **Base de datos**: Supabase / PlanetScale / Neon para persistencia

## 🎨 Personalización

### Colores

Edita `/app/globals.css` y los componentes para cambiar el esquema de colores:

```css
/* Paleta actual: Azul/Morado/Gris oscuro */
--slate-950: #020617
--blue-500: #3b82f6
--purple-500: #8b5cf6
```

### Datos Mock

Edita `/lib/data.ts` para cambiar las cuentas, transacciones y presupuestos de ejemplo.

## 📁 Estructura del Proyecto

```
banco-personal/
├── app/
│   ├── layout.tsx          # Layout principal
│   ├── page.tsx             # Página de inicio (dashboard)
│   └── globals.css          # Estilos globales
├── components/
│   ├── Hero3D.tsx           # Tarjeta 3D animada
│   ├── AccountCard.tsx      # Card de cuenta bancaria
│   ├── TransactionList.tsx  # Lista de transacciones
│   ├── BudgetOverview.tsx   # Vista de presupuestos
│   ├── FinanceChart.tsx     # Gráfico de ingresos/gastos
│   └── StatsGrid.tsx        # Grid de estadísticas
├── lib/
│   ├── data.ts              # Datos mock
│   └── utils.ts             # Utilidades (formatters, etc)
└── package.json
```

## 🔐 Seguridad

**⚠️ IMPORTANTE**: Este es un proyecto de demostración. Para uso en producción:

1. ✅ Implementa autenticación robusta (Auth0, Clerk, Supabase Auth)
2. ✅ Encripta datos sensibles en tránsito y en reposo
3. ✅ Usa variables de entorno para API keys
4. ✅ Implementa rate limiting
5. ✅ Valida y sanitiza todas las entradas de usuario
6. ✅ Audita integraciones de APIs financieras

## 🚀 Deploy

### Vercel (Recomendado)

```bash
npm install -g vercel
vercel
```

### Cloudflare Pages

```bash
npm run build
# Deploy la carpeta .next
```

## 💡 Próximas Features

- [ ] Autenticación de usuarios
- [ ] Conexión con APIs bancarias reales
- [ ] Exportación de datos (CSV, PDF)
- [ ] Notificaciones y alertas
- [ ] Categorización automática con IA
- [ ] Proyecciones financieras
- [ ] Modo claro/oscuro
- [ ] Múltiples idiomas

## 👨‍💻 Autor

**David López**  
Portfolio: [dsltdev.com](https://dsltdev.com)  
GitHub: [@dsltdev](https://github.com/dsltdev)

## 📄 Licencia

MIT License - Siéntete libre de usar este proyecto como base para tu propio banco personal.

---

**Construido con ❤️ y Cursor** | © 2026 David López
