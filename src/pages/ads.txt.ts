// /ads.txt: AdSense lo exige para pagarte. Se genera desde MONETIZATION.adsenseClient,
// así que solo hay un lugar donde poner tu ID de publisher.
import { MONETIZATION } from '../game/config';

export function GET() {
  const pub = MONETIZATION.adsenseClient.replace(/^ca-/, '');
  const body = pub
    ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
    : '# Sin red publicitaria configurada todavía (MONETIZATION.adsenseClient en src/game/config.ts).\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
