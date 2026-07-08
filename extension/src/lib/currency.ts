export const TO_USD: Record<string, number> = {
  USD: 1, EUR: 1.08, GBP: 1.27, VND: 0.000039, JPY: 0.0067, SGD: 0.74,
}

export const FROM_USD: Record<string, number> = Object.fromEntries(
  Object.entries(TO_USD).map(([k, v]) => [k, 1 / v])
)

export function toUSD(amount: number, currency: string): number {
  return amount * (TO_USD[currency] ?? 1)
}

export function monthlyEquivalentUSD(amount: number, currency: string, cycle: string): number {
  const usd = toUSD(amount, currency)
  if (cycle === 'monthly') return usd
  if (cycle === 'yearly')  return usd / 12
  if (cycle === 'weekly')  return usd * 4.33
  return 0
}

export function convertFromUSD(usdAmount: number, displayCurrency: string): number {
  return usdAmount * (FROM_USD[displayCurrency] ?? 1)
}
