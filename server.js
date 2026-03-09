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
const DEFAULT_META_TITLE = 'remarket — цифровые товары'
const DEFAULT_META_DESCRIPTION = 'Маркетплейс цифровых товаров, аккаунтов и услуг.'
const DEFAULT_META_IMAGE = '/assets/logo.ico'

function toAbsolute(urlPath) {
  if (!urlPath) return ''
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) return urlPath
  const normalizedBase = FILE_BASE.endsWith('/') ? FILE_BASE.slice(0, -1) : FILE_BASE
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`
  return `${normalizedBase}${normalizedPath}`
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

function safeDecodePathPart(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function renderMetaTags(meta) {
  const title = escapeHtml(meta.title)
  const description = escapeHtml(meta.description)
  const image = escapeHtml(meta.image)
  const imageAlt = escapeHtml(meta.imageAlt || meta.title)
  const pageUrl = escapeHtml(meta.url)
  const type = escapeHtml(meta.type)

  return `
    <meta name="description" content="${description}">
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
  `
}

async function buildMeta(url, reqHost, reqProto = 'http') {
  const u = new URL(url, `${reqProto}://${reqHost}`)
  const pathParts = u.pathname
    .split('/')
    .filter(Boolean)
    .map(safeDecodePathPart)

  const defaultImage = toAbsolute(DEFAULT_META_IMAGE) || `${reqProto}://${reqHost}/favicon.ico`
  let meta = {
    title: DEFAULT_META_TITLE,
    description: DEFAULT_META_DESCRIPTION,
    image: defaultImage,
    imageAlt: 'remarket',
    url: u.toString(),
    type: 'website',
  }

  try {
    if (pathParts[0] === 'product' && pathParts[1]) {
      const productKey = encodeURIComponent(pathParts[1])
      const res = await fetch(`${API_BASE}/products/${productKey}`)
      if (res.ok) {
        const data = await res.json()
        const img = data.images?.[0]?.image_url || data.images?.[0]?.url
        const productTitle = normalizeText(data.title, 120)
        const productDescription = normalizeText(data.description, 180)
        meta = {
          title: productTitle ? `${productTitle} — купить на remarket` : meta.title,
          description: productDescription || meta.description,
          image: img ? toAbsolute(img) : meta.image,
          imageAlt: productTitle || 'Product image',
          url: u.toString(),
          type: 'product',
        }
      }
    } else if (pathParts[0] === 'user' && pathParts[1]) {
      const username = encodeURIComponent(pathParts[1])
      const res = await fetch(`${API_BASE}/users/${username}`)
      if (res.ok) {
        const data = await res.json()
        const avatar = data.avatar_url || data.avatar || ''
        const profileName = normalizeText(data.username, 120)
        const profileDescription = normalizeText(data.description, 180)
        meta = {
          title: profileName ? `${profileName} — профиль на remarket` : meta.title,
          description: profileDescription || 'Профиль пользователя на remarket.',
          image: toAbsolute(avatar) || meta.image,
          imageAlt: profileName || 'User avatar',
          url: u.toString(),
          type: 'profile',
        }
      }
    }
  } catch (e) {
    console.warn('OG meta fetch failed', e?.message || e)
  }

  return renderMetaTags(meta)
}

async function createServer() {
  const app = express()
  // trust x-forwarded-* headers from reverse proxy
  app.set('trust proxy', true)
  app.use(compression())

  let vite
  if (!isProd) {
    vite = await (await import('vite')).createServer({
      root: __dirname,
      server: { middlewareMode: true },
    })
    app.use(vite.middlewares)
  } else {
    app.use('/assets', express.static(resolve('dist/client/assets'), { maxAge: '1y' }))
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

      const metaTags = await buildMeta(url, reqHost, reqProto)

      const { html, preloadLinks } = await render(url, manifest)
      const htmlResp = template
        .replace('<!--meta-tags-->', metaTags)
        .replace('<!--preload-links-->', preloadLinks || '')
        .replace('<!--ssr-outlet-->', html)

      res.status(200).set({ 'Content-Type': 'text/html' }).end(htmlResp)
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
