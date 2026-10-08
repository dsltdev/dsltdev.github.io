// Anuncios.
//
//  - Con MONETIZATION.adsenseClient configurado: anuncios reales de Google. El anuncio con
//    recompensa usa la API Ad Placement (adBreak, type 'reward'), que requiere una cuenta de
//    AdSense for Games aprobada para el dominio.
//  - Sin cliente: no hay anuncios. Solo en desarrollo, o con ?demoads en la URL, se usa un
//    anuncio simulado para probar el flujo.
import { MONETIZATION } from './config';

/** viewed = lo vio completo (hay recompensa); dismissed = lo cerró antes; unavailable = no hubo anuncio. */
export type AdResult = 'viewed' | 'dismissed' | 'unavailable';

type AdBreakOptions = {
  type: 'reward';
  name: string;
  beforeReward?: (showAd: () => void) => void;
  adViewed?: () => void;
  adDismissed?: () => void;
  adBreakDone?: (info: { breakStatus?: string }) => void;
};

type AdWindow = Window & {
  adsbygoogle?: unknown[];
  adBreak?: (o: AdBreakOptions) => void;
  adConfig?: (o: Record<string, unknown>) => void;
};

const w = window as AdWindow;

const demoAllowed = () => import.meta.env.DEV || new URLSearchParams(location.search).has('demoads');

export const hasRealAds = () => Boolean(MONETIZATION.adsenseClient);

/**
 * ¿Hay alguna forma de mostrar un anuncio con recompensa en esta sesión?
 * `allowReal = false` excluye la red publicitaria real (solo queda el modo de prueba).
 */
export const hasRewardedAds = (allowReal = true) => (allowReal && hasRealAds()) || demoAllowed();

let scriptState: 'idle' | 'loading' | 'failed' = 'idle';

/** Carga adsbygoogle.js una sola vez (lo comparten el anuncio con recompensa y el banner). */
function ensureAdsScript() {
  if (!hasRealAds() || scriptState !== 'idle') return;
  scriptState = 'loading';

  w.adsbygoogle = w.adsbygoogle || [];
  w.adBreak = w.adConfig = (o: unknown) => {
    w.adsbygoogle!.push(o);
  };
  w.adConfig({ preloadAdBreaks: 'on', sound: 'off' });

  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(MONETIZATION.adsenseClient)}`;
  if (MONETIZATION.adsenseTestMode) script.dataset.adbreakTest = 'on';
  script.onerror = () => {
    scriptState = 'failed'; // bloqueador de anuncios o sin red
  };
  document.head.appendChild(script);
}

/** Prepara la red publicitaria en cuanto carga la página para que el anuncio esté precargado. */
export function initAds() {
  ensureAdsScript();
}

/** Inserta un banner de AdSense. Devuelve false si no hay cliente o slot configurados. */
export function mountBanner(container: HTMLElement): boolean {
  const { adsenseClient, adsenseBannerSlot } = MONETIZATION;
  if (!adsenseClient || !adsenseBannerSlot) return false;
  ensureAdsScript();

  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.dataset.adClient = adsenseClient;
  ins.dataset.adSlot = adsenseBannerSlot;
  ins.dataset.adFormat = 'auto';
  ins.dataset.fullWidthResponsive = 'true';
  container.appendChild(ins);

  try {
    w.adsbygoogle!.push({});
  } catch {
    return false;
  }
  return true;
}

function showGoogleRewardedAd(): Promise<AdResult> {
  return new Promise((resolve) => {
    ensureAdsScript();
    if (scriptState === 'failed' || !w.adBreak) return resolve('unavailable');

    let settled = false;
    const done = (r: AdResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(noResponse);
      resolve(r);
    };
    // Si Google no responde nada (script bloqueado o lento), no dejamos al jugador esperando.
    const noResponse = setTimeout(() => done('unavailable'), 6000);

    w.adBreak({
      type: 'reward',
      name: 'boost-x2',
      // El botón "Ver anuncio" ya hizo de aviso al jugador: se muestra directo.
      beforeReward: (showAd) => {
        clearTimeout(noResponse);
        showAd();
      },
      adViewed: () => done('viewed'),
      adDismissed: () => done('dismissed'),
      // Se llama siempre al final; si nada se resolvió antes, es que no hubo anuncio.
      adBreakDone: () => done('unavailable')
    });
  });
}

function showDemoAd(dialog: HTMLDialogElement): Promise<AdResult> {
  return new Promise((resolve) => {
    const label = dialog.querySelector<HTMLElement>('[data-ad-count]')!;
    const skip = dialog.querySelector<HTMLButtonElement>('[data-ad-close]')!;
    let left = MONETIZATION.demoAdSeconds;
    let done = false;

    const finish = (r: AdResult) => {
      if (done) return;
      done = true;
      clearInterval(timer);
      skip.removeEventListener('click', onSkip);
      dialog.removeEventListener('cancel', onSkip);
      dialog.close();
      resolve(r);
    };
    const onSkip = (e?: Event) => {
      e?.preventDefault();
      finish('dismissed');
    };

    label.textContent = String(left);
    skip.addEventListener('click', onSkip);
    dialog.addEventListener('cancel', onSkip);
    dialog.showModal();

    const timer = setInterval(() => {
      left--;
      label.textContent = String(Math.max(0, left));
      if (left <= 0) finish('viewed');
    }, 1000);
  });
}

/** Muestra un anuncio con recompensa con el proveedor que corresponda. */
export function showRewardedAd(demoDialog: HTMLDialogElement, allowReal = true): Promise<AdResult> {
  if (allowReal && hasRealAds()) return showGoogleRewardedAd();
  if (demoAllowed()) return showDemoAd(demoDialog);
  return Promise.resolve('unavailable');
}

/** Evento de analítica (Plausible ya está cargado en el Layout). Falla en silencio. */
export function track(event: string, props?: Record<string, string | number>) {
  try {
    (window as unknown as { plausible?: (e: string, o?: unknown) => void }).plausible?.(event, props ? { props } : undefined);
  } catch {
    /* sin analítica no pasa nada */
  }
}
