/** Datos extraídos del checkout. Nada aquí es un feed de broker. */

export const gaps = [
  'No hay NinjaTrader, estrategias .cs ni Documents/NinjaTrader en esta VM.',
  'No hay CSV, ticks, klines ni resultados de backtest.',
  'No hay notebooks ni fórmulas de física de laboratorio.',
  'Cybersentinel y DSLT Señales se nombran aquí; el código vive fuera de este repo.',
];

export const sources = [
  {
    path: 'src/components/Projects.astro',
    theme: 'Mercados',
    note: 'Cybersentinel (wallet/exchange/IA) y DSLT Señales (Kelly, backtesting, Wompi).',
  },
  {
    path: 'src/components/HardSkillsBoard.astro',
    theme: 'Desk paper',
    note: 'Libros USD/COP, señal en cierre / fill en apertura, BVC vs cripto, Yahoo delayed, SMA mentirosa.',
  },
  {
    path: 'public/portfolio/trading.svg',
    theme: 'Paper',
    note: 'Mock DSLT MARKET: BTC/USD, ETH/USD, ECOPETL COP. Etiqueta PAPER.',
  },
  {
    path: 'src/pages/blog/webhook-payouts-wompi-firma-invalida.astro',
    theme: 'Matemáticas',
    note: 'HMAC con secreto y sobre equivocados: checksum destinado a fallar siempre.',
  },
  {
    path: 'src/components/Offer.astro',
    theme: 'Invariantes',
    note: 'Webhook forjado, 100×, reintento duplicado, dos órdenes / un libro.',
  },
  {
    path: 'src/components/Hero.astro',
    theme: 'Trading',
    note: 'Ruta ilustrativa GET /trading/señales y race de fills.',
  },
  {
    path: 'worker/src/ingest.ts',
    theme: 'Física (falso positivo)',
    note: '“Seguridad física” en un prompt infantil — no es física de mercados.',
  },
];

export const paperPositions = [
  { symbol: 'BTC/USD', venue: 'Binance paper', pnlPct: 2.4, mark: 4200, ccy: 'USD', note: 'Del mock trading.svg' },
  { symbol: 'ETH/USD', venue: 'Binance paper', pnlPct: -0.8, mark: 2800, ccy: 'USD', note: 'Del mock trading.svg' },
  { symbol: 'ECOPETL', venue: 'BVC delayed', pnlPct: 0, mark: null, ccy: 'COP', note: 'Paper COP — sin mark numérico en el SVG' },
];

/** Curva ilustrativa (no histórica). Sigue el polyline del SVG, reescalada. */
export const paperCurve = [
  50.6, 51.0, 50.85, 51.55, 51.4, 52.05, 51.75, 52.35, 52.2, 52.5, 52.25, 52.4,
];

export const kelly = {
  formula: 'f* = p − q / b',
  meaning: [
    'f*: fracción del bankroll a arriesgar',
    'p: probabilidad de ganar (estimada, no conocida)',
    'q = 1 − p',
    'b: odds netas (ganancia / riesgo)',
  ],
  defaults: { p: 0.55, b: 1.2 },
  source: 'Projects.astro nombra “sizing con criterio de Kelly” en DSLT Señales; no hay p/b reales en este repo.',
};

export const dualLedger = {
  rules: [
    'COP no tiene subunidades: cantidades enteras.',
    'Fee por lado: cada libro cobra la suya.',
    'Cash, costo y mark son tres números distintos.',
    'Un libro no puede debitar al otro.',
  ],
  example: {
    usdCash: 10000,
    copCash: 40_000_000,
    feeUsd: 2.5,
    feeCop: 12000,
    qtyBtc: 0.15,
  },
};

export const hmacCase = {
  checkout: 'timestamp anidado en signature; secreto de checkout',
  payouts: 'timestamp hermano de signature; secreto distinto',
  result: 'checksum calculado ≠ checksum real, siempre. 401 silencioso. Transferencias eternas en pending.',
  source: 'src/pages/blog/webhook-payouts-wompi-firma-invalida.astro',
};

export const sessions = {
  bvc: {
    name: 'BVC (Bolsa de Valores de Colombia)',
    tz: 'America/Bogota',
    open: '09:30',
    close: '16:00',
    note: 'HardSkillsBoard: sesión BVC vs cripto. Horario de rueda regular ilustrativo (no calendario de festivos).',
  },
  crypto: {
    name: 'Cripto spot (Binance paper)',
    tz: 'UTC',
    open: '00:00',
    close: '24:00',
    note: '24h. Yahoo delayed contra spot no es el mismo reloj.',
  },
  causality: {
    signal: 'Señal en el cierre de la barra',
    fill: 'Fill en la apertura siguiente',
    lie: 'SMA sobre un CSV quieto con reloj en 1970',
  },
};

export const products = [
  {
    name: 'Cybersentinel',
    href: 'https://wallet.dsltdev.com',
    blurb: 'Wallet cripto/COP, exchange, trading con IA. Bancolombia, Wompi, Truora. JWT en 7 servicios.',
  },
  {
    name: 'DSLT Señales',
    href: 'https://saas.dsltdev.com',
    blurb: 'Señales LATAM, backtesting, Kelly, ejecución automática opcional.',
  },
];
