export const DEFAULT_HOURLY_RATE = 50;
export const PAY_ROUNDING_STEP = 10;
export const MAX_HOURS_PER_DAY = 24;
export const DEFAULT_POSITION_RANK = 50;
export const resolveHourlyRate = (value) => {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_HOURLY_RATE;
};
export const resolvePositionRank = (value) => {
  const rank = Number(value);
  return Number.isFinite(rank) && rank > 0 ? rank : DEFAULT_POSITION_RANK;
};
export const roundOvertimePay = (amount) =>
  Math.ceil((Number(amount) || 0) / PAY_ROUNDING_STEP) * PAY_ROUNDING_STEP;
