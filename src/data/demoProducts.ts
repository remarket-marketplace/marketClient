export type PlatformKey = 'telegram' | 'x'
export type ListingType = 'dictionary' | 'crypto' | 'personal'

type CardSeller = {
  username: string
  is_active: boolean
}

type DemoProductDetails = {
  market_comment: string
  ownership_note: string
  transfer_eta: string
  price_reference: string
  use_cases: string[]
  deal_flow: string[]
}

export type DemoProductCard = {
  id: string
  title: string
  description: string
  price: number
  seller: CardSeller
  images: Array<{ image_url: string }>
  category: {
    name: string
  }
  is_demo: true
  platform: PlatformKey
  listing_type: ListingType
  promo_badges?: string[]
  trust_badges?: string[]
  currency_symbol?: string
  details: DemoProductDetails
}

export const demoProductsByPlatform: Record<PlatformKey, DemoProductCard[]> = {
  telegram: [
    {
      id: 'demo-tg-1',
      title: '@mint',
      description: 'Short dictionary handle for a branded Telegram channel.',
      price: 4200,
      seller: { username: 'demo_market', is_active: true },
      images: [],
      category: { name: 'Telegram' },
      is_demo: true,
      platform: 'telegram',
      listing_type: 'dictionary',
      currency_symbol: '$',
      promo_badges: ['💎 Rare Gem', '📉 -20% from Floor'],
      details: {
        market_comment: 'High memorability and clean spelling make it easy to promote in paid communities and branded channels.',
        ownership_note: 'Ownership is transferred as a Telegram collectible username with escrow-backed settlement inside the marketplace.',
        transfer_eta: 'Usually 15-40 minutes after payment lock-in',
        price_reference: 'Comparable 4-letter dictionary handles: $3,000-$10,000',
        use_cases: ['Premium news channel', 'Personal media brand', 'Crypto updates hub'],
        deal_flow: ['Buyer locks payment in escrow', 'Seller transfers username ownership', 'Buyer verifies receipt and releases funds'],
      },
    },
    {
      id: 'demo-tg-2',
      title: '@tonalpha',
      description: 'Crypto/NFT handle for a TON community and alpha signals.',
      price: 2600,
      seller: { username: 'demo_market', is_active: true },
      images: [],
      category: { name: 'Telegram' },
      is_demo: true,
      platform: 'telegram',
      listing_type: 'crypto',
      currency_symbol: '$',
      promo_badges: ['🔥 Hot Deal'],
      details: {
        market_comment: 'Keyword fit with TON trading themes increases click-through in search and referral traffic.',
        ownership_note: 'Transfer is executed through Telegram handle reassignment with platform escrow and event logging.',
        transfer_eta: 'Usually 20-60 minutes during active support hours',
        price_reference: 'Comparable niche crypto handles: $1,500-$5,000',
        use_cases: ['Signals channel', 'NFT research group', 'TON ecosystem project page'],
        deal_flow: ['Escrow payment confirmation', 'Handle transfer to buyer account', 'Final confirmation in chat and settlement'],
      },
    },
    {
      id: 'demo-tg-3',
      title: '@alextrade',
      description: 'Personal-name style handle for a public expert profile.',
      price: 1700,
      seller: { username: 'demo_market', is_active: false },
      images: [],
      category: { name: 'Telegram' },
      is_demo: true,
      platform: 'telegram',
      listing_type: 'personal',
      currency_symbol: '$',
      details: {
        market_comment: 'Name-style handles are flexible for personal branding and easier to resell to individual creators.',
        ownership_note: 'Account handover follows standard marketplace procedure with proof of control before release.',
        transfer_eta: 'Typically 30-90 minutes depending on seller response',
        price_reference: 'Comparable personal handles: $1,500-$3,500',
        use_cases: ['Expert profile', 'Consulting channel', 'Educational newsletter'],
        deal_flow: ['Buyer starts secured deal', 'Seller confirms transfer action', 'Buyer validates control and completes deal'],
      },
    },
    {
      id: 'demo-tg-4',
      title: '@apple',
      description: 'Top-tier dictionary word handle with deep liquidity.',
      price: 16500,
      seller: { username: 'demo_market', is_active: true },
      images: [],
      category: { name: 'Telegram' },
      is_demo: true,
      platform: 'telegram',
      listing_type: 'dictionary',
      currency_symbol: '$',
      promo_badges: ['💎 Rare Gem'],
      details: {
        market_comment: 'Single-word dictionary assets are scarce and usually hold premium pricing in secondary markets.',
        ownership_note: 'Escrow protects both parties until the buyer confirms final ownership transfer in Telegram.',
        transfer_eta: 'Normally 20-50 minutes with instant support confirmation',
        price_reference: 'Comparable premium dictionary handles: $12,000-$50,000',
        use_cases: ['Corporate channel', 'Consumer brand identity', 'High-trust media asset'],
        deal_flow: ['Buyer deposits funds to escrow', 'Seller completes transfer flow', 'Platform support confirms and settles deal'],
      },
    },
  ],
  x: [
    {
      id: 'demo-x-1',
      title: '@xtradehub',
      description: 'Built for trading, fintech narratives, and analytics threads.',
      price: 2100,
      seller: { username: 'demo_market', is_active: true },
      images: [],
      category: { name: 'X' },
      is_demo: true,
      platform: 'x',
      listing_type: 'crypto',
      currency_symbol: '$',
      trust_badges: ['Original Email Included', 'Escrow Protection 24h', 'Audit Passed'],
      details: {
        market_comment: 'Topic relevance and clean keyword match improve profile discovery in finance-focused feeds.',
        ownership_note: 'Seller provides transfer credentials and confirmation package under escrow supervision.',
        transfer_eta: 'Usually 30-120 minutes depending on account checks',
        price_reference: 'Comparable X fintech handles: $1,200-$3,500',
        use_cases: ['Market commentary profile', 'Trading team brand', 'Fintech media account'],
        deal_flow: ['Buyer secures payment in escrow', 'Seller passes account control package', 'Buyer validates login and releases funds'],
      },
    },
    {
      id: 'demo-x-2',
      title: '@dailyalpha',
      description: 'General-purpose brand handle for an X growth profile.',
      price: 2900,
      seller: { username: 'demo_market', is_active: true },
      images: [],
      category: { name: 'X' },
      is_demo: true,
      platform: 'x',
      listing_type: 'dictionary',
      currency_symbol: '$',
      trust_badges: ['Original Email Included', 'Escrow Protection 24h', 'Audit Passed'],
      promo_badges: ['📉 -20% from Floor'],
      details: {
        market_comment: 'Consistent two-word structure helps with recall and broad audience targeting.',
        ownership_note: 'Escrow flow includes account handover checklist and post-transfer verification checkpoint.',
        transfer_eta: 'Usually 45-150 minutes based on security reset timing',
        price_reference: 'Comparable dictionary-style X handles: $1,500-$4,000',
        use_cases: ['Thread publishing account', 'Newsletter companion profile', 'Creator growth brand'],
        deal_flow: ['Deal starts with escrow lock', 'Seller transfers account access and recovery data', 'Buyer confirms control and completes settlement'],
      },
    },
    {
      id: 'demo-x-3',
      title: '@threadcraft',
      description: 'Positioned for experts publishing high-frequency educational threads.',
      price: 1600,
      seller: { username: 'demo_market', is_active: false },
      images: [],
      category: { name: 'X' },
      is_demo: true,
      platform: 'x',
      listing_type: 'personal',
      currency_symbol: '$',
      trust_badges: ['Original Email Included', 'Escrow Protection 24h', 'Audit Passed'],
      promo_badges: ['⏳ Auction Ends in 2h'],
      details: {
        market_comment: 'Creator-focused naming keeps context clear and supports authority positioning for niche experts.',
        ownership_note: 'Marketplace moderation verifies transfer artifacts before releasing payment to seller.',
        transfer_eta: 'Usually 30-120 minutes, may vary if seller is offline',
        price_reference: 'Comparable creator-style X handles: $900-$2,500',
        use_cases: ['Educational creator profile', 'Consulting funnel entry', 'Audience trust-building account'],
        deal_flow: ['Buyer funds escrow', 'Seller submits transfer package', 'Buyer validates full recovery control and confirms'],
      },
    },
    {
      id: 'demo-x-4',
      title: '@growthzone',
      description: 'Strong fit for a digital agency and growth-focused operating team.',
      price: 2400,
      seller: { username: 'demo_market', is_active: true },
      images: [],
      category: { name: 'X' },
      is_demo: true,
      platform: 'x',
      listing_type: 'dictionary',
      currency_symbol: '$',
      trust_badges: ['Original Email Included', 'Escrow Protection 24h', 'Audit Passed'],
      promo_badges: ['🔥 Hot Deal'],
      details: {
        market_comment: 'Agency-ready semantics and high clarity make this handle attractive for service-driven brands.',
        ownership_note: 'Transfer is completed through secure credential handover with escrow-backed finalization.',
        transfer_eta: 'Usually 40-120 minutes with support-assisted verification',
        price_reference: 'Comparable agency-themed X handles: $1,200-$3,500',
        use_cases: ['Agency brand profile', 'Lead-generation account', 'Growth operations publishing'],
        deal_flow: ['Escrow secures buyer funds', 'Seller passes ownership and recovery data', 'Buyer confirms and funds are released'],
      },
    },
  ],
}

export const allDemoProducts: DemoProductCard[] = Object.values(demoProductsByPlatform).flat()

export const demoProductsById: Record<string, DemoProductCard> = allDemoProducts.reduce(
  (accumulator, product) => {
    accumulator[product.id] = product
    return accumulator
  },
  {} as Record<string, DemoProductCard>,
)
