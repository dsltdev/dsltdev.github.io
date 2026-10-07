#!/usr/bin/env node
// Genera un código de canje para un comprador y el hash que debes pegar en
// src/game/config.ts (MONETIZATION.redeemCodes). El código solo se lo das al comprador.
//
//   node scripts/gen-code.mjs pro
//   node scripts/gen-code.mjs gold
import { createHash, randomBytes } from 'node:crypto';

const product = process.argv[2];
if (product !== 'pro' && product !== 'gold') {
  console.error('Uso: node scripts/gen-code.mjs <pro|gold>');
  process.exit(1);
}

// Sin 0/O/1/I para que el comprador no se equivoque al teclear.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const bytes = randomBytes(12);
const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]);
const code = [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].map((g) => g.join('')).join('-');
const hash = createHash('sha256').update(code).digest('hex');

console.log(`Código para el comprador: ${code}`);
console.log('');
console.log('Pega esta línea dentro de MONETIZATION.redeemCodes en src/game/config.ts:');
console.log(`  '${hash}': '${product}',`);
