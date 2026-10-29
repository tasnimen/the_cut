// Single money formatter. Prices are stored as integer minor units (cents).
export function formatMoney(minorUnits, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minorUnits / 100);
}
