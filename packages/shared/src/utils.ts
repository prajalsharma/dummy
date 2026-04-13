import { createHash, randomBytes } from 'crypto';

export function generateReferralCode(length = 8): string {
  return randomBytes(length).toString('base64url').slice(0, length).toUpperCase();
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function formatUSDC(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}${formatUSDC(pnl)}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function calculateLiquidationPrice(
  side: 'long' | 'short',
  entryPrice: number,
  leverage: number,
  maintenanceMarginRate = 0.005,
): number {
  const marginRate = 1 / leverage;
  if (side === 'long') {
    return entryPrice * (1 - marginRate + maintenanceMarginRate);
  } else {
    return entryPrice * (1 + marginRate - maintenanceMarginRate);
  }
}

export function calculateUnrealizedPnl(
  side: 'long' | 'short',
  size: number,
  entryPrice: number,
  markPrice: number,
): number {
  if (side === 'long') {
    return size * (markPrice - entryPrice);
  } else {
    return size * (entryPrice - markPrice);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
