export const parseWeightKg = (raw) =>
  parseFloat(String(raw ?? "").replace(/[^\d.]/g, "")) || 0;
export const logWeightKg = (log) =>
  log?.weight_kg != null
    ? parseWeightKg(log.weight_kg)
    : parseWeightKg(log?.product?.weight);
export const logWeightTon = (log) =>
  log?.total_weight_kg != null
    ? (Number(log.total_weight_kg) || 0) / 1000
    : (Number(log?.quantity) || 0) * logWeightKg(log) / 1000;
export const getBatchLogs = (batch) =>
  batch?.production_logs || batch?.productionLogs || [];
export const getBatchStats = (batch) => {
  const logs = getBatchLogs(batch);
  return {
    productsCount: logs.length,
    totalQuantity: logs.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0),
    totalWeightTon: Number(
      logs.reduce((sum, l) => sum + logWeightTon(l), 0).toFixed(3),
    ),
  };
};
