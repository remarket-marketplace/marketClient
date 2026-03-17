export const PRICE_OFFER_MESSAGE_TEMPLATE_KEYS = ['price_offer_buy_now'] as const

export type PriceOfferMessageTemplateKey = typeof PRICE_OFFER_MESSAGE_TEMPLATE_KEYS[number]

const PRICE_OFFER_TEMPLATE_PREFIX = '[[tpl:'
const PRICE_OFFER_TEMPLATE_SUFFIX = ']]'
const PRICE_OFFER_TEMPLATE_KEY_SET = new Set<string>(PRICE_OFFER_MESSAGE_TEMPLATE_KEYS)

export function encodePriceOfferTemplateMessage(templateKey: PriceOfferMessageTemplateKey): string {
  return `${PRICE_OFFER_TEMPLATE_PREFIX}${templateKey}${PRICE_OFFER_TEMPLATE_SUFFIX}`
}

export function decodePriceOfferTemplateKey(
  message: string | null | undefined,
): PriceOfferMessageTemplateKey | null {
  if (!message || !message.startsWith(PRICE_OFFER_TEMPLATE_PREFIX) || !message.endsWith(PRICE_OFFER_TEMPLATE_SUFFIX)) {
    return null
  }

  const templateKey = message.slice(
    PRICE_OFFER_TEMPLATE_PREFIX.length,
    -PRICE_OFFER_TEMPLATE_SUFFIX.length,
  )
  if (!PRICE_OFFER_TEMPLATE_KEY_SET.has(templateKey)) {
    return null
  }

  return templateKey as PriceOfferMessageTemplateKey
}
