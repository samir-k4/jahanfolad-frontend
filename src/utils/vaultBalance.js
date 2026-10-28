// Mirrors the backend rule (config/vault.php): sarafi and bank accounts may hold a debt,
// every other (physical) account can never go below zero.
const NEGATIVE_ALLOWED_TYPES = ["sarafi", "bank"];

export const canGoNegative = (vault) => NEGATIVE_ALLOWED_TYPES.includes(vault?.type);

export const exceedsBalance = (vault, balance, amount) =>
  Boolean(vault) && !canGoNegative(vault) && amount > balance;

export const willGoNegative = (vault, balance, amount) =>
  Boolean(vault) && canGoNegative(vault) && amount > 0 && balance - amount < 0;
