export function formatProductName(product, categoryOverride = "") {
  if (!product) return "";
  let rawName = typeof product === "string" ? product : product.name || product.product_name || "";
  let cleanName = rawName.replace(/\((.*?)\)/g, "$1").trim();
  cleanName = cleanName.replace(
    /(\d+(?:\.\d+)?)\s*(?:[xX*×])\s*(\d+(?:\.\d+)?)/g,
    "\u200E$1 x $2\u200E"
  );
  let categoryName = "";
  if (categoryOverride) {
    categoryName = String(categoryOverride).trim();
  } else if (typeof product === "object" && product !== null) {
    categoryName = String(
      product.category?.name ||
      product.category_name ||
      (typeof product.category === "string" ? product.category : "") ||
      ""
    ).trim();
  }
  if (categoryName) {
    const cleanLower = cleanName.toLowerCase();
    const catLower = categoryName.toLowerCase();
    if (!cleanLower.startsWith(catLower)) {
      cleanName = `${categoryName} ${cleanName}`;
    }
  }
  return cleanName;
}
export function formatProductOption(product, weightOverride = "", categoryOverride = "") {
  if (!product) return "";
  const cleanName = formatProductName(product, categoryOverride);
  const weight =
    typeof product === "object"
      ? product.weight || weightOverride
      : weightOverride;
  if (weight) {
    return `\u200E${cleanName}  —  ${weight}`;
  }
  return `\u200E${cleanName}`;
}
export function getProductWeights(product) {
  if (!product) return [];
  if (Array.isArray(product.weights)) return product.weights;
  if (Array.isArray(product.weightOptions)) return product.weightOptions;
  if (Array.isArray(product.weight_options)) return product.weight_options;
  return product.weight ? [product.weight] : [];
}
