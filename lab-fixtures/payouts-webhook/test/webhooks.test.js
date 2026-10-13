import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { handleCheckoutWebhook } from '../src/routes/webhooks.js';

process.env.WOMPI_EVENTS_KEY = 'test_events_key';

function signedCheckoutEvent() {
  const data = { transaction: { id: 'tx_1', status: 'APPROVED', amount_in_cents: 5000000 } };
  const timestamp = 1700000000;
  const properties = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];
  const checksum = createHash('sha256')
    .update('tx_1APPROVED5000000' + timestamp + process.env.WOMPI_EVENTS_KEY)
    .digest('hex');
  return { event: 'transaction.updated', data, signature: { properties, checksum, timestamp } };
}

function fakeRes() {
  const res = { statusCode: 0, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
}

test('checkout: acepta un evento con firma válida', () => {
  const res = fakeRes();
  handleCheckoutWebhook({ body: signedCheckoutEvent() }, res);
  assert.equal(res.statusCode, 200);
});

test('checkout: rechaza un evento con firma alterada', () => {
  const event = signedCheckoutEvent();
  event.signature.checksum = 'deadbeef';
  const res = fakeRes();
  handleCheckoutWebhook({ body: event }, res);
  assert.equal(res.statusCode, 401);
});
