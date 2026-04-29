import fs from 'fs'
import path from 'path'
import express from 'express'
import compression from 'compression'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const resolve = (p) => path.resolve(__dirname, p)
const isProd = process.env.NODE_ENV === 'production'
const PORT = process.env.PORT || 4173
const API_BASE = (process.env.API_URL || process.env.VITE_API_HOST || 'http://localhost:8000/v1').replace(/\/$/, '')
const FILE_BASE = (process.env.FILE_BASE || '').replace(/\/$/, '') || API_BASE
const PUBLIC_SITE_URL = (process.env.SITE_URL || process.env.PUBLIC_SITE_URL || '').replace(/\/$/, '')
const DEFAULT_META_TITLE = 'remarket — цифровые товары'
const DEFAULT_META_DESCRIPTION = 'Маркетплейс цифровых товаров, аккаунтов и услуг с безопасными сделками и автовыдачей.'
const DEFAULT_META_IMAGE = '/assets/logo.ico'
const SITEMAP_CACHE_TTL_MS = 15 * 60 * 1000
const SITEMAP_PER_PAGE = 200
const SITEMAP_MAX_PAGES = 50
let sitemapCache = {
  expiresAt: 0,
  body: '',
}

const STATIC_ROUTE_META = {
  '/': {
    title: DEFAULT_META_TITLE,
    description: DEFAULT_META_DESCRIPTION,
  },
  '/official': {
    title: 'Официальные товары — remarket',
    description: 'Официальные цифровые товары и услуги на remarket.',
  },
  '/vpn': {
    title: 'Scope VPN — быстрый VPN от remarket',
    description: 'Подключите Scope VPN: быстрые серверы, разные сроки подписки и удобная покупка на remarket.',
  },
  '/remarket-vpn': {
    title: 'Scope VPN — быстрый VPN от remarket',
    description: 'Подключите Scope VPN: быстрые серверы, разные сроки подписки и удобная покупка на remarket.',
    canonicalPath: '/vpn',
  },
  '/become-seller': {
    title: 'Как начать продавать — remarket',
    description: 'Короткий гид по продаже цифровых товаров, правилам сделок и безопасности на remarket.',
  },
  '/about': {
    title: 'О remarket',
    description: 'remarket — маркетплейс цифровых товаров и безопасных пользовательских сделок.',
  },
  '/rules': {
    title: 'Правила площадки — remarket',
    description: 'Правила публикации товаров, модерации, сделок и возвратов на remarket.',
  },
  '/terms': {
    title: 'Пользовательское соглашение — remarket',
    description: 'Условия использования маркетплейса remarket.',
  },
  '/privacy-policy': {
    title: 'Политика конфиденциальности — remarket',
    description: 'Как remarket обрабатывает и защищает пользовательские данные.',
  },
  '/privacy': {
    title: 'Политика конфиденциальности — remarket',
    description: 'Как remarket обрабатывает и защищает пользовательские данные.',
    canonicalPath: '/privacy-policy',
  },
}

const STATIC_SITEMAP_PATHS = [
  '/',
  '/official',
  '/vpn',
  '/become-seller',
  '/about',
  '/rules',
  '/terms',
  '/privacy-policy',
]

const STATIC_KNOWN_PATHS = new Set([
  ...Object.keys(STATIC_ROUTE_META),
  '/signin',
  '/signup',
  '/password-reset',
  '/password-reset-email',
  '/password-reset-code',
  '/user/products/favorites',
  '/user/products/archive',
  '/product/create',
  '/chats',
  '/not-access',
  '/banned',
  '/admin',
  '/admin/users',
  '/admin/products',
  '/admin/deals',
  '/admin/payments',
  '/admin/withdrawals',
  '/admin/promo-codes',
  '/admin/categories',
  '/admin/support/chats',
  '/admin/feedback',
  '/admin/complaints',
  '/admin/activity-logs',
  '/admin/categories/create',
  '/partner/fortnite-stats',
  '/partner/vpn-stats',
  '/wallet',
  '/steam-topup',
  '/settings',
  '/payment/success',
  '/payment/failed',
  '/feedback',
])

const NOINDEX_PATH_RE = /^\/(admin|partner|wallet|settings|chats|signin|signup|password-reset|password-reset-email|password-reset-code|payment|product\/create|product\/edit|user\/products|steam-topup|feedback|banned|not-access)(\/|$)/
const DISALLOW_ROBOT_PATHS = [
  '/admin/',
  '/partner/',
  '/wallet',
  '/settings',
  '/chats',
  '/signin',
  '/signup',
  '/password-reset',
  '/password-reset-email',
  '/password-reset-code',
  '/payment/',
  '/product/create',
  '/product/edit/',
  '/user/products/',
  '/steam-topup',
  '/feedback',
  '/banned',
  '/not-access',
]

function toAbsolute(urlPath) {
  if (!urlPath) return ''
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) return urlPath
  const normalizedBase = FILE_BASE.endsWith('/') ? FILE_BASE.slice(0, -1) : FILE_BASE
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`
  return `${normalizedBase}${normalizedPath}`
}

function getSiteOrigin(reqHost, reqProto = 'http') {
  if (PUBLIC_SITE_URL) return PUBLIC_SITE_URL
  const host = String(reqHost || 'localhost').replace(/^www\.re-market\.net$/i, 're-market.net')
  return `${reqProto}://${host}`
}

function normalizePathname(pathname) {
  const normalized = pathname.replace(/\/{2,}/g, '/')
  if (normalized.length > 1 && normalized.endsWith('/')) {
    return normalized.slice(0, -1)
  }
  return normalized || '/'
}

function buildCanonicalUrl(pathname, reqHost, reqProto, canonicalPath) {
  const origin = getSiteOrigin(reqHost, reqProto)
  return `${origin}${normalizePathname(canonicalPath || pathname)}`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeText(value, maxLength = 180) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function safeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function safeDecodePathPart(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function slugifyClient(value, fallback = 'item') {
  const normalized = String(value || '')
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return normalized || fallback
}

function buildProductKey(product) {
  if (!product?.id) return ''
  return `${slugifyClient(product.slug || product.title, 'product')}-${product.id}`
}

function buildCategoryKey(category) {
  if (!category?.id) return ''
  return slugifyClient(category.slug || category.name_en || category.name, '') || category.id
}

function isKnownAppPath(pathname) {
  const path = normalizePathname(pathname)
  if (STATIC_KNOWN_PATHS.has(path)) return true

  const parts = path.split('/').filter(Boolean)
  if (parts.length === 2 && ['product', 'category', 'user'].includes(parts[0])) return true
  if (parts.length === 3 && parts[0] === 'product' && parts[1] === 'edit') return true
  if (parts.length === 3 && parts[0] === 'admin' && ['users', 'deal', 'feedback', 'complaints', 'categories', 'chats'].includes(parts[1])) return true
  if (parts.length === 4 && parts[0] === 'admin' && parts[1] === 'users' && parts[2] === 'edit') return true
  if (parts.length === 4 && parts[0] === 'admin' && parts[1] === 'categories' && parts[2] === 'edit') return true
  if (parts.length === 2 && parts[0] === 'chats') return true

  return false
}

function renderHeadTags(seo) {
  const title = escapeHtml(seo.meta.title)
  const description = escapeHtml(seo.meta.description)
  const image = escapeHtml(seo.meta.image)
  const imageAlt = escapeHtml(seo.meta.imageAlt || seo.meta.title)
  const pageUrl = escapeHtml(seo.meta.url)
  const type = escapeHtml(seo.meta.type)
  const canonical = escapeHtml(seo.meta.canonical)
  const robots = seo.noindex ? 'noindex, nofollow' : 'index, follow'
  const jsonLd = seo.jsonLd?.length
    ? seo.jsonLd.map((entry) => `<script type="application/ld+json">${safeJsonLd(entry)}</script>`).join('\n')
    : ''

  return `
    <meta name="description" content="${description}">
    <meta name="robots" content="${robots}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:site_name" content="remarket">
    <meta property="og:locale" content="ru_RU">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:alt" content="${imageAlt}">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:type" content="${type}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">
    <meta name="twitter:image:alt" content="${imageAlt}">
    ${jsonLd}
  `
}

function createBaseSeo(url, reqHost, reqProto = 'http') {
  const u = new URL(url, `${reqProto}://${reqHost}`)
  const pathname = normalizePathname(u.pathname)
  const routeMeta = STATIC_ROUTE_META[pathname] || {}
  const canonical = buildCanonicalUrl(pathname, reqHost, reqProto, routeMeta.canonicalPath)
  const defaultImage = toAbsolute(DEFAULT_META_IMAGE) || `${getSiteOrigin(reqHost, reqProto)}/favicon.ico`
  const noindex = NOINDEX_PATH_RE.test(pathname)
  const status = isKnownAppPath(pathname) ? 200 : 404

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'remarket',
    url: getSiteOrigin(reqHost, reqProto),
  }
  const jsonLd = [websiteJsonLd]

  if (routeMeta.title) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: routeMeta.title,
      description: routeMeta.description || DEFAULT_META_DESCRIPTION,
      url: canonical,
    })
  }

  return {
    pathname,
    pathParts: pathname.split('/').filter(Boolean).map(safeDecodePathPart),
    noindex: noindex || status === 404,
    status,
    meta: {
      title: routeMeta.title || DEFAULT_META_TITLE,
      description: routeMeta.description || DEFAULT_META_DESCRIPTION,
      image: defaultImage,
      imageAlt: 'remarket',
      url: canonical,
      canonical,
      type: 'website',
    },
    jsonLd,
  }
}

function createBreadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

async function buildSeo(url, reqHost, reqProto = 'http') {
  const seo = createBaseSeo(url, reqHost, reqProto)
  const siteOrigin = getSiteOrigin(reqHost, reqProto)

  try {
    if (seo.pathParts[0] === 'product' && seo.pathParts[1] && seo.pathParts.length === 2) {
      const productKey = encodeURIComponent(seo.pathParts[1])
      const res = await fetch(`${API_BASE}/products/${productKey}`)
      if (res.ok) {
        const data = await res.json()
        const img = data.images?.[0]?.image_url || data.images?.[0]?.url
        const productTitle = normalizeText(data.title, 120)
        const productDescription = normalizeText(data.description, 180)
        const canonicalProductPath = `/product/${buildProductKey(data) || seo.pathParts[1]}`
        const canonical = buildCanonicalUrl(canonicalProductPath, reqHost, reqProto)
        const category = data.parent_category || data.category
        const subcategory = data.parent_category ? data.category : null
        const breadcrumbs = [
          { name: 'Главная', url: `${siteOrigin}/` },
        ]
        if (category) breadcrumbs.push({ name: category.name || category.name_ru || category.name_en || 'Категория', url: `${siteOrigin}/category/${buildCategoryKey(category)}` })
        if (subcategory) breadcrumbs.push({ name: subcategory.name || subcategory.name_ru || subcategory.name_en || 'Подкатегория', url: `${siteOrigin}/category/${buildCategoryKey(category)}?subcategory=${buildCategoryKey(subcategory)}` })
        breadcrumbs.push({ name: productTitle || 'Товар', url: canonical })

        seo.meta = {
          title: productTitle ? `${productTitle} — купить на remarket` : seo.meta.title,
          description: productDescription || seo.meta.description,
          image: img ? toAbsolute(img) : seo.meta.image,
          imageAlt: productTitle || 'Product image',
          url: canonical,
          canonical,
          type: 'product',
        }
        seo.jsonLd.push(
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: productTitle || data.title,
            description: productDescription || data.description,
            image: data.images?.map((image) => toAbsolute(image.image_url || image.url)).filter(Boolean),
            sku: data.id,
            category: category?.name || category?.name_ru || category?.name_en,
            offers: {
              '@type': 'Offer',
              url: canonical,
              priceCurrency: 'RUB',
              price: data.price,
              availability: data.is_sold ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
              itemCondition: 'https://schema.org/NewCondition',
              seller: {
                '@type': 'Person',
                name: data.seller?.username || 'remarket seller',
              },
            },
          },
          createBreadcrumbJsonLd(breadcrumbs),
        )
      } else if (res.status === 404) {
        seo.status = 404
        seo.noindex = true
      }
    } else if (seo.pathParts[0] === 'category' && seo.pathParts[1] && seo.pathParts.length === 2) {
      const categoryKey = encodeURIComponent(seo.pathParts[1])
      const res = await fetch(`${API_BASE}/categories/${categoryKey}`)
      if (res.ok) {
        const data = await res.json()
        const categoryName = normalizeText(data.name || data.name_ru || data.name_en, 120)
        const description = normalizeText(data.description, 180) || `Цифровые товары в категории ${categoryName} на remarket.`
        const canonicalCategoryPath = `/category/${buildCategoryKey(data) || seo.pathParts[1]}`
        const canonical = buildCanonicalUrl(canonicalCategoryPath, reqHost, reqProto)
        seo.meta = {
          title: categoryName ? `${categoryName} — товары на remarket` : seo.meta.title,
          description,
          image: toAbsolute(data.banner_url || data.image_url) || seo.meta.image,
          imageAlt: categoryName || 'Category image',
          url: canonical,
          canonical,
          type: 'website',
        }
        seo.jsonLd.push(
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: categoryName,
            description,
            url: canonical,
          },
          createBreadcrumbJsonLd([
            { name: 'Главная', url: `${siteOrigin}/` },
            { name: categoryName || 'Категория', url: canonical },
          ]),
        )
      } else if (res.status === 404) {
        seo.status = 404
        seo.noindex = true
      }
    } else if (seo.pathParts[0] === 'user' && seo.pathParts[1] && seo.pathParts.length === 2) {
      const username = encodeURIComponent(seo.pathParts[1])
      const res = await fetch(`${API_BASE}/users/${username}`)
      if (res.ok) {
        const data = await res.json()
        const avatar = data.avatar_url || data.avatar || ''
        const profileName = normalizeText(data.username, 120)
        const profileDescription = normalizeText(data.description, 180)
        const canonical = buildCanonicalUrl(`/user/${encodeURIComponent(data.username || seo.pathParts[1])}`, reqHost, reqProto)
        seo.meta = {
          title: profileName ? `${profileName} — профиль на remarket` : seo.meta.title,
          description: profileDescription || 'Профиль пользователя на remarket.',
          image: toAbsolute(avatar) || seo.meta.image,
          imageAlt: profileName || 'User avatar',
          url: canonical,
          canonical,
          type: 'profile',
        }
        seo.jsonLd.push({
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          name: profileName,
          description: seo.meta.description,
          url: canonical,
        })
      } else if (res.status === 404) {
        seo.status = 404
        seo.noindex = true
      }
    }
  } catch (e) {
    console.warn('SEO meta fetch failed', e?.message || e)
  }

  return seo
}

function renderRobots(reqHost, reqProto) {
  const siteOrigin = getSiteOrigin(reqHost, reqProto)
  return [
    'User-agent: *',
    'Allow: /',
    ...DISALLOW_ROBOT_PATHS.map((pathValue) => `Disallow: ${pathValue}`),
    `Sitemap: ${siteOrigin}/sitemap.xml`,
    '',
  ].join('\n')
}

async function fetchPaginated(endpoint, key) {
  const items = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages && page <= SITEMAP_MAX_PAGES) {
    const res = await fetch(`${API_BASE}${endpoint}?page=${page}&per_page=${SITEMAP_PER_PAGE}`)
    if (!res.ok) break
    const data = await res.json()
    const pageItems = Array.isArray(data[key]) ? data[key] : []
    items.push(...pageItems)
    totalPages = Number(data.total_pages || 1)
    page += 1
  }

  return items
}

async function renderSitemap(reqHost, reqProto) {
  if (sitemapCache.body && Date.now() < sitemapCache.expiresAt) {
    return sitemapCache.body
  }

  const siteOrigin = getSiteOrigin(reqHost, reqProto)
  const urls = STATIC_SITEMAP_PATHS.map((pathValue) => ({
    loc: `${siteOrigin}${pathValue}`,
    changefreq: pathValue === '/' ? 'daily' : 'weekly',
    priority: pathValue === '/' ? '1.0' : '0.7',
  }))

  try {
    const [categories, products] = await Promise.all([
      fetchPaginated('/categories/', 'categories'),
      fetchPaginated('/products/get/all', 'products'),
    ])

    categories
      .filter((category) => category?.id && category?.is_active !== false && !category?.parent_id)
      .forEach((category) => {
        urls.push({
          loc: `${siteOrigin}/category/${buildCategoryKey(category)}`,
          changefreq: 'daily',
          priority: '0.8',
        })
      })

    products
      .filter((product) => product?.id && product?.status === 'active' && product?.is_sold !== true)
      .forEach((product) => {
        urls.push({
          loc: `${siteOrigin}/product/${buildProductKey(product)}`,
          lastmod: product.created_at,
          changefreq: 'daily',
          priority: '0.9',
        })
      })
  } catch (e) {
    console.warn('Sitemap fetch failed', e?.message || e)
  }

  const uniqueUrls = Array.from(new Map(urls.map((entry) => [entry.loc, entry])).values())
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    uniqueUrls.map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${xmlEscape(String(entry.lastmod).slice(0, 10))}</lastmod>` : ''
      return `  <url>\n    <loc>${xmlEscape(entry.loc)}</loc>${lastmod}\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`
    }).join('\n') +
    `\n</urlset>\n`

  sitemapCache = {
    expiresAt: Date.now() + SITEMAP_CACHE_TTL_MS,
    body,
  }

  return body
}

async function createServer() {
  const app = express()
  // trust x-forwarded-* headers from reverse proxy
  app.set('trust proxy', true)
  app.use(compression())

  app.get('/robots.txt', (req, res) => {
    const reqHost = req.headers.host || 'localhost'
    const reqProto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0]
    res
      .status(200)
      .type('text/plain')
      .send(renderRobots(reqHost, reqProto))
  })

  app.get('/sitemap.xml', async (req, res) => {
    const reqHost = req.headers.host || 'localhost'
    const reqProto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0]
    const body = await renderSitemap(reqHost, reqProto)
    res
      .status(200)
      .type('application/xml')
      .send(body)
  })

  let vite
  if (!isProd) {
    vite = await (await import('vite')).createServer({
      root: __dirname,
      server: { middlewareMode: true },
    })
    app.use(vite.middlewares)
  } else {
    app.use('/assets', express.static(resolve('dist/client/assets'), { maxAge: '1y' }))
    app.use(express.static(resolve('dist/client'), { index: false, maxAge: '1h' }))
    // проксируем статику /uploads на API хост (картинки товаров)
    app.use('/uploads', async (req, res) => {
      const target = `${FILE_BASE}${req.originalUrl}`
      try {
        const upstream = await fetch(target)
        if (!upstream.ok) return res.sendStatus(upstream.status)
        upstream.headers.forEach((v, k) => res.setHeader(k, v))
        upstream.body.pipe(res)
      } catch (e) {
        console.warn('Upload proxy error', target, e?.message || e)
        res.sendStatus(502)
      }
    })
  }

  app.use('*', async (req, res, next) => {
    try {
      const url = req.originalUrl
      const reqHost = req.headers.host || 'localhost'
      const reqProto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0]

      let template
      let render
      let manifest

      if (!isProd) {
        template = fs.readFileSync(resolve('index.html'), 'utf-8')
        template = await vite.transformIndexHtml(url, template)
        render = (await vite.ssrLoadModule('/src/entry-server.ts')).render
      } else {
        template = fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
        manifest = JSON.parse(fs.readFileSync(resolve('dist/client/.vite/ssr-manifest.json'), 'utf-8'))
        render = (await import('./dist/server/entry-server.js')).render
      }

      const seo = await buildSeo(url, reqHost, reqProto)
      const headTags = renderHeadTags(seo)
      const titleTag = `<title>${escapeHtml(seo.meta.title)}</title>`

      const { html, preloadLinks } = await render(url, manifest)
      const htmlResp = template
        .replace(/<title>.*?<\/title>/, titleTag)
        .replace('<!--meta-tags-->', headTags)
        .replace('<!--preload-links-->', preloadLinks || '')
        .replace('<!--ssr-outlet-->', html)

      res.status(seo.status).set({ 'Content-Type': 'text/html' }).end(htmlResp)
    } catch (e) {
      if (!isProd && vite) vite.ssrFixStacktrace(e)
      next(e)
    }
  })

  app.listen(PORT, () => {
    console.log(`SSR server running at http://localhost:${PORT}`)
  })
}

createServer()
