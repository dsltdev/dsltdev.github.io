// Configuración del juego y de la monetización.
// Todo lo que genera dinero se activa rellenando los campos vacíos de MONETIZATION.
// Ver docs/MONETIZACION.md para el paso a paso.

export const SAVE_KEY = 'pagos-idle:v1';

/** Máximo de tiempo offline que se recompensa (segundos) y eficiencia de esa producción. */
export const OFFLINE_CAP_SECONDS = 8 * 3600;
export const OFFLINE_EFFICIENCY = 0.5;

export const COST_GROWTH = 1.15;
export const LICENSE_BONUS = 0.05; // +5% de producción por licencia
export const LICENSE_DIVISOR = 5e6; // licencias = floor(sqrt(runEarned / divisor))

/** "Pago VIP": moneda dorada que aparece de vez en cuando y da un bonus si la tocas a tiempo. */
export const GOLDEN = {
  /** Segundos de juego activo entre apariciones (al azar en este rango). */
  minDelay: 55,
  maxDelay: 120,
  /** Segundos que permanece en pantalla. */
  life: 9,
  /** Bonus de "lluvia": estos segundos de producción (o estos clicks si es lo mayor). */
  lumpSeconds: 45,
  lumpClicks: 30,
  /** Probabilidad de "frenesí" en vez de lluvia, y su efecto sobre producción y clicks. */
  frenzyChance: 0.3,
  frenzyMultiplier: 5,
  frenzySeconds: 20
};

export interface GeneratorDef {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  baseCps: number;
  color: string;
}

export const GENERATORS: GeneratorDef[] = [
  { id: 'webhook', name: 'Webhook', desc: 'Recibe notificaciones de pago.', baseCost: 15, baseCps: 0.1, color: '#c98a3a' },
  { id: 'qr', name: 'Cobro QR', desc: 'Un QR en cada mostrador.', baseCost: 100, baseCps: 1, color: '#d9a04a' },
  { id: 'pasarela', name: 'Pasarela', desc: 'Checkout integrado en tiendas.', baseCost: 1_100, baseCps: 8, color: '#e0a23e' },
  { id: 'wallet', name: 'Wallet', desc: 'Saldo y transferencias entre usuarios.', baseCost: 12_000, baseCps: 47, color: '#e8b45a' },
  { id: 'exchange', name: 'Exchange', desc: 'Compra y venta de cripto en COP.', baseCost: 130_000, baseCps: 260, color: '#f3c778' },
  { id: 'banco', name: 'Banco digital', desc: 'Cuentas, tarjetas y crédito.', baseCost: 1_400_000, baseCps: 1_400, color: '#f6d594' },
  { id: 'red', name: 'Red de pagos', desc: 'Conecta bancos de toda Latinoamérica.', baseCost: 20_000_000, baseCps: 7_800, color: '#fbe6b8' }
];

export type UpgradeKind = 'click' | 'clickCps' | 'gen';

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  kind: UpgradeKind;
  /** Multiplicador (click, gen) o fracción del cps que suma cada click (clickCps). */
  value: number;
  /** Para 'gen': id del generador. */
  target?: string;
  /** Requisito para mostrarla. */
  requires: { owned?: { id: string; count: number }; earned?: number };
}

const TIERS = [
  { own: 10, costMul: 10, label: 'Optimizado' },
  { own: 25, costMul: 100, label: 'Escalado' },
  { own: 50, costMul: 1000, label: 'Redundante' }
];

const CLICK_UPGRADES: UpgradeDef[] = [
  { id: 'click1', name: 'Dedo ágil', desc: 'Cada click vale x2.', cost: 100, kind: 'click', value: 2, requires: { earned: 50 } },
  { id: 'click2', name: 'Atajos de teclado', desc: 'Cada click vale x2.', cost: 2_000, kind: 'click', value: 2, requires: { earned: 1_000 } },
  { id: 'clickCps1', name: 'Click inteligente', desc: 'Cada click suma además el 2% de tu producción por segundo.', cost: 50_000, kind: 'clickCps', value: 0.02, requires: { earned: 20_000 } },
  { id: 'click3', name: 'Doble monitor', desc: 'Cada click vale x2.', cost: 400_000, kind: 'click', value: 2, requires: { earned: 200_000 } },
  { id: 'clickCps2', name: 'Click maestro', desc: 'Cada click suma además otro 3% de tu producción por segundo.', cost: 5_000_000, kind: 'clickCps', value: 0.03, requires: { earned: 2_000_000 } },
];

const GEN_UPGRADES: UpgradeDef[] = GENERATORS.flatMap((g) =>
  TIERS.map<UpgradeDef>((t, i) => ({
    id: `${g.id}-${i + 1}`,
    name: `${g.name} ${t.label.toLowerCase()}`,
    desc: `${g.name} produce x2.`,
    cost: g.baseCost * t.costMul,
    kind: 'gen',
    value: 2,
    target: g.id,
    requires: { owned: { id: g.id, count: t.own } }
  }))
);

export const UPGRADES: UpgradeDef[] = [...CLICK_UPGRADES, ...GEN_UPGRADES].sort((a, b) => a.cost - b.cost);

export type ProductId = 'pro' | 'gold';

export interface ProductDef {
  id: ProductId;
  name: string;
  desc: string;
  /** Texto de precio que ve el jugador. */
  price: string;
  /** Link de pago (p. ej. un Payment Link de Wompi). Vacío = "Próximamente". */
  url: string;
}

export const MONETIZATION = {
  /**
   * Publisher de AdSense, p. ej. 'ca-pub-1234567890123456'. Vacío = sin anuncios reales.
   * Activa a la vez: el anuncio con recompensa (API Ad Placement de Google), el banner
   * (si hay slot) y el archivo /ads.txt.
   */
  adsenseClient: '',
  /** Ad slot del banner (opcional; número que da AdSense). Vacío = sin banner. */
  adsenseBannerSlot: '',
  /** true = Google sirve anuncios de prueba simulados. Úsalo al integrar; apágalo al publicar. */
  adsenseTestMode: false,
  /** Link de donación (Wompi, Buy Me a Coffee, etc.). Vacío = botón oculto. */
  donateUrl: '',
  /** Boost que se obtiene al ver un anuncio con recompensa. */
  rewardedBoost: { multiplier: 2, seconds: 120, maxSeconds: 600 },
  /** Segundos del anuncio simulado (solo en desarrollo o con ?demoads en la URL). */
  demoAdSeconds: 5,
  products: [
    { id: 'pro', name: 'Pase Pro', desc: 'Producción x2 para siempre.', price: '$9.900 COP', url: '' },
    { id: 'gold', name: 'Maletín de oro', desc: '+4 horas de producción al instante.', price: '$4.900 COP', url: '' }
  ] satisfies ProductDef[],
  /**
   * Códigos de canje: hash SHA-256 (hex) del código -> producto.
   * Tras un pago generas un código con `node scripts/gen-code.mjs pro` y se lo envías al
   * comprador. Solo guardamos el hash, no el código.
   */
  redeemCodes: {} as Record<string, ProductId>
};

/** Horas de producción que entrega el Maletín de oro. */
export const GOLD_HOURS = 4;
