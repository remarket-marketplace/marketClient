const UUID_SUFFIX_RE =
  /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/

type UrlEntity = {
  id: string
  slug?: string | null
}

export function buildSlugKey(
  slug: string | null | undefined,
  id: string | null | undefined,
  fallback = 'item',
): string {
  const normalizedId = (id ?? '').trim()
  if (!normalizedId) return ''

  const normalizedSlug = normalizeSlug(slug)
  const safeSlug = normalizedSlug || normalizeSlug(fallback) || 'item'
  return `${safeSlug}-${normalizedId}`
}

export function buildProductKey(product: UrlEntity | null | undefined): string {
  if (!product) return ''
  return buildSlugKey(product.slug, product.id, 'product')
}

export function buildCategoryKey(category: UrlEntity | null | undefined): string {
  if (!category) return ''
  const normalizedSlug = normalizeSlug(category.slug)
  if (normalizedSlug) return normalizedSlug

  const normalizedId = (category.id ?? '').trim()
  return normalizedId
}

export function extractIdFromSlugKey(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim()
  if (!raw) return null

  const match = raw.match(UUID_SUFFIX_RE)
  return match?.[1] ?? null
}

function normalizeSlug(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}
