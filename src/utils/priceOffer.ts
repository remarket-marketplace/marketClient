function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}

export function calculateDiscountPercent(
  originalPrice: number,
  offeredPrice: number,
): number | null {
  if (!Number.isFinite(originalPrice) || !Number.isFinite(offeredPrice)) return null
  if (originalPrice <= 0 || offeredPrice <= 0 || offeredPrice >= originalPrice) return null

  const percent = ((originalPrice - offeredPrice) / originalPrice) * 100
  if (!Number.isFinite(percent) || percent <= 0) return null

  return Math.max(1, Math.round(percent))
}

export function calculateOfferedPriceByPercent(
  originalPrice: number,
  discountPercent: number,
): number | null {
  if (!Number.isFinite(originalPrice) || originalPrice <= 0) return null
  if (!Number.isFinite(discountPercent) || discountPercent <= 0) return null

  const maxAllowed = roundToTwo(originalPrice - 0.01)
  if (maxAllowed <= 0) return null

  const normalizedPercent = Math.min(99, Math.max(1, discountPercent))
  const rawPrice = originalPrice * (1 - normalizedPercent / 100)
  const roundedPrice = roundToTwo(rawPrice)
  const clampedPrice = Math.max(0.01, Math.min(maxAllowed, roundedPrice))

  return roundToTwo(clampedPrice)
}
