import { useEffect, useState } from 'react';

// Rutas con hash (#/productos): el panel es una sola página estática, sin servidor que reescriba URLs.
const leer = () => (location.hash.replace(/^#/, '').split('?')[0] || '/').replace(/\/+$/, '') || '/';

export function useRuta() {
  const [ruta, setRuta] = useState(leer);
  useEffect(() => {
    const alCambiar = () => {
      setRuta(leer());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);
  return ruta;
}

export const href = (ruta: string) => `#${ruta}`;
