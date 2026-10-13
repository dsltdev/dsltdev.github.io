// Almacén en memoria de transferencias salientes (payouts).
const transfers = new Map();

export function createTransfer(id, amountInCents) {
  transfers.set(id, { id, amountInCents, status: 'pending' });
}

export function getTransfer(id) {
  return transfers.get(id);
}

export function updateTransferStatus(id, status) {
  const transfer = transfers.get(id);
  if (!transfer) return;
  transfer.status = status;
}
