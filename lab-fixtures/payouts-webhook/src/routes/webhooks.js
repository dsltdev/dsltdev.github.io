import { verifyEventSignature } from '../signature.js';
import { updateTransferStatus } from '../transfers.js';

// Confirmación de pagos de checkout: actualiza la orden asociada.
export function handleCheckoutWebhook(req, res) {
  const event = req.body;

  if (!verifyEventSignature(event, process.env.WOMPI_EVENTS_KEY)) {
    return res.status(401).json({ error: 'invalid_signature' });
  }

  // ... marca la orden como pagada
  return res.status(200).json({ ok: true });
}

// Confirmación de transferencias salientes (payouts): actualiza el estado
// de la transferencia cuando el proveedor la procesa.
export function handlePayoutsWebhook(req, res) {
  const event = req.body;

  console.log('payouts webhook', JSON.stringify(event));

  if (!verifyEventSignature(event, process.env.WOMPI_EVENTS_KEY)) {
    return res.status(401).json({ error: 'invalid_signature' });
  }

  const { transfer } = event.data;
  updateTransferStatus(transfer.id, transfer.status);

  return res.status(200).json({ ok: true });
}
