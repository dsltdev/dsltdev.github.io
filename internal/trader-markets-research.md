# Inventario: trader, mercados, matemáticas y física

Búsqueda en el checkout de `dsltdev/dsltdev.github.io` y en rutas típicas de esta VM (`/workspace`, `/home/ubuntu`, `/opt`, `/data`, `/tmp`, `/cursor`). Fecha del barrido: 2026-09-18.

**Conclusión:** no hay instalación de NinjaTrader, ni series OHLCV, ni notebooks de física o matemáticas. Lo útil está en copy del portafolio Astro (desk paper, Kelly, dual-ledger) y un post de blog sobre HMAC. El dashboard en `/desk` visualiza esas ideas y marca con claridad qué es ilustrativo.

## Lo que no apareció

| Objetivo | Resultado |
| --- | --- |
| NinjaTrader / NT8 / `.cs` de estrategias | Cero. Los únicos hits de “ninja” son generadores `ninja` de node-gyp. |
| CSV / ticks / klines / backtests | Ningún dataset. |
| Formulas .tex / notebooks | Ninguno. |
| Física de laboratorio | Ninguna. El único “física” es “seguridad física” en un prompt de ingest de un worker de contenido infantil (`worker/src/ingest.ts`), irrelevante para mercados. |

## Archivos del repo con contenido útil

### Portafolio y desk paper

| Ruta | Qué contiene |
| --- | --- |
| `src/components/Projects.astro` | **Cybersentinel**: wallet cripto/COP, exchange, trading con IA, JWT en 7 servicios. **DSLT Señales**: SaaS LATAM, backtesting histórico, **sizing Kelly**, ejecución automática opcional, cobros Wompi. URLs `wallet.dsltdev.com` / `saas.dsltdev.com`. |
| `src/components/HardSkillsBoard.astro` | Modelo operativo del desk: libros USD/COP, COP sin subunidades, fee por lado, cash vs costo vs mark; señal en el **cierre** y fill en la **apertura siguiente**; Yahoo delayed vs spot 24h; sesión **BVC vs cripto**; paper ≠ live; race de fills/dedup; klines; “cinta de ticks”. Nombra “Desk paper · Binance + BVC delayed”. |
| `src/components/Hero.astro` | Tagline fintech/pagos/trading; log ilustrativo `GET /trading/señales`; race de fills. |
| `src/components/About.astro` | Señales de trading, Wompi/Bancolombia/Truora en producción. |
| `src/layouts/Layout.astro` | Meta: “sistemas de trading en Cloudflare Workers”. |
| `public/portfolio/trading.svg` | Mock de terminal **DSLT MARKET / PAPER**: curva, BTC/USD +2.4% $4,200, ETH/USD −0.8% $2,800, ECOPETL COP paper. No es un feed real. |
| `src/pages/index.astro` | Ensambla el sitio en español. |

### Matemáticas (aplicadas a dinero, no a un paper)

| Ruta | Qué contiene |
| --- | --- |
| `src/components/Projects.astro` | Criterio de Kelly para sizing (sin fórmula escrita en el repo). |
| `src/pages/blog/webhook-payouts-wompi-firma-invalida.astro` | Firma HMAC con secreto y sobre equivocados: el checksum **nunca** coincide — “matemáticamente destinada a fallar siempre”. Dos esquemas Wompi (checkout vs Payouts). |
| `src/components/Offer.astro` | El mismo hallazgo de webhook; invariantes de dinero (webhook forjado, 100×, reintento duplicado, dos órdenes / un libro). |
| `src/components/HardSkillsBoard.astro` | Invariante de cash ida y vuelta; qty entero vs fracción; SMA sobre CSV quieto como test que miente. |
| `sdk/src/client.ts` | `Math.pow(2, attempt)` backoff — utilitario, no de mercados. |

### Física

Nada de mecánica, ondas, o modelos físicos de mercado. Falso positivo:

| Ruta | Qué contiene |
| --- | --- |
| `worker/src/ingest.ts` | Prompt de seguridad infantil: “Seguridad física”, “presente física y emocionalmente”. |

El dashboard trata el **desfase causal señal→fill** (cierre vs apertura) como el único análogo de “tiempo físico” que el repo describe.

### Infra relacionada (no es un motor de trading)

| Ruta | Qué contiene |
| --- | --- |
| `worker/` | Cloudflare Worker de ingest de contenido (no señales). |
| `sdk/` | Cliente HTTP con reintentos. |
| `.github/workflows/` | Build/deploy del sitio estático. |

## Fuentes fuera del checkout

Búsqueda de nombres `*ninja*`, `*trader*`, `*trading*`, `*.csv` en `/home`, `/opt`, `/data`, `/tmp`, `/cursor`: solo `public/portfolio/trading.svg` y ruido de `node-gyp`. No hay `Documents/NinjaTrader 8` ni export de estrategias.

## Cómo se usa esto en el dashboard

Rutas Astro (UI en español, como el resto del sitio):

- `/desk` — inventario, posiciones paper del SVG, avisos de gap.
- `/desk/matematicas` — Kelly interactivo, dual-ledger USD/COP, HMAC que no puede coincidir.
- `/desk/sesiones` — BVC vs cripto 24h, SMA que miente, lag cierre→apertura.
- `/desk/fuentes` — este inventario navegable.

Todo gráfico de precio/PnL es **sintético / paper**, etiquetado. No hay datos de broker.

## Huecos para una siguiente pasada

1. Export real de NinjaTrader o klines Binance/BVC.
2. Código de DSLT Señales / Cybersentinel (viven fuera de este repo).
3. Parámetros reales de Kelly (p, b) del SaaS.
4. Notas de física o cuant si existen en otra máquina.
