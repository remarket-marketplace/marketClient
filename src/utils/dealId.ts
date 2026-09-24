const DEFAULT_DEAL_ID_LENGTH = 8

export function getShortDealId(
  dealId: string | null | undefined,
  length = DEFAULT_DEAL_ID_LENGTH,
): string {
  const normalizedDealId = String(dealId ?? '').trim()
  if (!normalizedDealId) {
    return ''
  }

  const compactDealId = normalizedDealId.replace(/-/g, '')
  const shortLength = Math.max(1, length)

  return compactDealId.slice(0, shortLength).toUpperCase()
}
