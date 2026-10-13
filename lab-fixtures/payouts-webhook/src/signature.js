import { createHash } from 'node:crypto';

// Verifica un evento firmado: concatena los valores de `signature.properties`
// (rutas dentro de `data`), el timestamp y el secreto, y compara el SHA-256.
export function verifyEventSignature(event, secret) {
  const { properties, checksum, timestamp } = event.signature ?? {};
  if (!properties || !checksum || !timestamp) return false;

  const values = properties.map((path) =>
    path.split('.').reduce((obj, key) => obj?.[key], event.data),
  );
  const expected = createHash('sha256')
    .update(values.join('') + timestamp + secret)
    .digest('hex');

  return expected === checksum;
}
