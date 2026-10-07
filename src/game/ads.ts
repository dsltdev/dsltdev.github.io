// Anuncios. Mientras MONETIZATION.adsense* esté vacío, el anuncio con recompensa es
// una simulación de pocos segundos para poder probar el flujo completo.
import { MONETIZATION } from './config';

/** Inserta un banner de AdSense. Devuelve false si no hay credenciales configuradas. */
export function mountBanner(container: HTMLElement): boolean {
  const { adsenseClient, adsenseBannerSlot } = MONETIZATION;
  if (!adsenseClient || !adsenseBannerSlot) return false;

  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}`;
  document.head.appendChild(script);

  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.dataset.adClient = adsenseClient;
  ins.dataset.adSlot = adsenseBannerSlot;
  ins.dataset.adFormat = 'auto';
  ins.dataset.fullWidthResponsive = 'true';
  container.appendChild(ins);

  try {
    ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ||= []).push({});
  } catch {
    return false;
  }
  return true;
}

/**
 * Muestra un anuncio con recompensa. Resuelve true si el jugador lo vio completo.
 *
 * Para conectar uno real (AdSense for Games / H5 Games Ads, Poki, CrazyGames...)
 * reemplaza el cuerpo de esta función por la llamada al SDK; el resto del juego
 * solo depende de la promesa.
 */
export function showRewardedAd(dialog: HTMLDialogElement): Promise<boolean> {
  return new Promise((resolve) => {
    const label = dialog.querySelector<HTMLElement>('[data-ad-count]')!;
    const skip = dialog.querySelector<HTMLButtonElement>('[data-ad-close]')!;
    let left = MONETIZATION.demoAdSeconds;
    let done = false;

    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearInterval(timer);
      skip.removeEventListener('click', onSkip);
      dialog.removeEventListener('cancel', onSkip);
      dialog.close();
      resolve(ok);
    };
    const onSkip = (e?: Event) => {
      e?.preventDefault();
      finish(false);
    };

    label.textContent = String(left);
    skip.addEventListener('click', onSkip);
    dialog.addEventListener('cancel', onSkip);
    dialog.showModal();

    const timer = setInterval(() => {
      left--;
      label.textContent = String(Math.max(0, left));
      if (left <= 0) finish(true);
    }, 1000);
  });
}

/** Evento de analítica (Plausible ya está cargado en el Layout). Falla en silencio. */
export function track(event: string, props?: Record<string, string | number>) {
  try {
    (window as unknown as { plausible?: (e: string, o?: unknown) => void }).plausible?.(event, props ? { props } : undefined);
  } catch {
    /* sin analítica no pasa nada */
  }
}
