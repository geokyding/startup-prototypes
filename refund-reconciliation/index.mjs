import { run } from '../run.mjs';

run(new URL('./sample.json', import.meta.url), ({ orders, refunds, settlements }) => {
  function totals(rows) {
    const result = new Map();
    for (const [index, { orderId, cents }] of rows.entries()) {
      if (!orderId || !Number.isSafeInteger(cents) || cents < 0) {
        throw new Error('Each row requires an orderId and nonnegative integer cents');
      }
      const previous = result.get(orderId) ?? { cents: 0, rows: [] };
      const total = previous.cents + cents;
      if (!Number.isSafeInteger(total)) throw new Error('Amount exceeds safe integer range');
      result.set(orderId, { cents: total, rows: [...previous.rows, index + 1] });
    }
    return result;
  }

  const sales = totals(orders);
  if (sales.size !== orders.length) throw new Error('Duplicate order IDs in orders');
  const returns = totals(refunds);
  const payouts = totals(settlements);
  const ids = new Set([...sales.keys(), ...returns.keys(), ...payouts.keys()]);
  const issues = [];
  for (const orderId of ids) {
    const sale = sales.get(orderId);
    const refund = returns.get(orderId);
    const payout = payouts.get(orderId);
    const expectedCents = (sale?.cents ?? 0) - (refund?.cents ?? 0);
    const settledCents = payout?.cents ?? 0;
    const reasons = [];
    if (!sale) reasons.push('missing_order');
    if (expectedCents < 0) reasons.push('refund_exceeds_order');
    if (!payout && expectedCents > 0) reasons.push('missing_settlement');
    if (settledCents !== expectedCents) reasons.push('amount_mismatch');
    if (reasons.length) issues.push({ orderId, expectedCents, settledCents, reasons,
      sourceRows: { orders: sale?.rows ?? [], refunds: refund?.rows ?? [], settlements: payout?.rows ?? [] } });
  }
  return { checkedOrders: ids.size, issues };
});
