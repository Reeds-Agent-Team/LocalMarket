/**
 * Format a price amount for display
 */
export function formatSats(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;

  const lower = currency.toLowerCase();

  if (lower === 'btc' || lower === 'sats' || lower === 'sat') {
    // Show in sats if under 0.001 BTC or if already in sats
    if (lower === 'sats' || lower === 'sat') {
      return num.toLocaleString();
    }
    // BTC
    if (num < 0.001) {
      const sats = Math.round(num * 100_000_000);
      return sats.toLocaleString();
    }
    return num.toFixed(8).replace(/\.?0+$/, '');
  }

  // USD/EUR/etc
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
