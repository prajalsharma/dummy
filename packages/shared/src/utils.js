"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReferralCode = generateReferralCode;
exports.hashApiKey = hashApiKey;
exports.formatUSDC = formatUSDC;
exports.formatPnl = formatPnl;
exports.formatPercent = formatPercent;
exports.calculateLiquidationPrice = calculateLiquidationPrice;
exports.calculateUnrealizedPnl = calculateUnrealizedPnl;
exports.sleep = sleep;
exports.truncateAddress = truncateAddress;
const crypto_1 = require("crypto");
function generateReferralCode(length = 8) {
    return (0, crypto_1.randomBytes)(length).toString('base64url').slice(0, length).toUpperCase();
}
function hashApiKey(key) {
    return (0, crypto_1.createHash)('sha256').update(key).digest('hex');
}
function formatUSDC(amount) {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatPnl(pnl) {
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${formatUSDC(pnl)}`;
}
function formatPercent(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}
function calculateLiquidationPrice(side, entryPrice, leverage, maintenanceMarginRate = 0.005) {
    const marginRate = 1 / leverage;
    if (side === 'long') {
        return entryPrice * (1 - marginRate + maintenanceMarginRate);
    }
    else {
        return entryPrice * (1 + marginRate - maintenanceMarginRate);
    }
}
function calculateUnrealizedPnl(side, size, entryPrice, markPrice) {
    if (side === 'long') {
        return size * (markPrice - entryPrice);
    }
    else {
        return size * (entryPrice - markPrice);
    }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function truncateAddress(address) {
    if (!address || address.length < 10)
        return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
//# sourceMappingURL=utils.js.map