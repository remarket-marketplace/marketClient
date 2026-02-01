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

function toAbsolute(urlPath) {
  if (!urlPath) return ''
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) return urlPath
  const normalizedBase = FILE_BASE.endsWith('/') ? FILE_BASE.slice(0, -1) : FILE_BASE
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`
  return `${normalizedBase}${normalizedPath}`
}

async function buildMeta(url, reqHost, reqProto = 'http') {
  const u = new URL(url, `${reqProto}://${reqHost}`)
  const pathParts = u.pathname.split('/').filter(Boolean)
  console.log('[meta]', u.toString(), 'API_BASE:', API_BASE, 'parts:', pathParts)
  let meta = {
    title: 'remarket — цифровые товары',
    description: 'Маркетплейс цифровых товаров, аккаунтов и услуг.',
    image: `${reqProto}://${reqHost}/logo.png`,
    url: u.toString(),
    type: 'website',
  }

  try {
    if (pathParts[0] === 'product' && pathParts[1]) {
      const res = await fetch(`${API_BASE}/products/${pathParts[1]}`)
      console.log('[meta] product fetch status', res.status)
      if (res.ok) {
        const data = await res.json()
        const img = data.images?.[0]?.image_url || data.images?.[0]?.url
        meta = {
          title: `${data.title} — купить на remarket`,
          description: (data.description || '').slice(0, 180) || meta.description,
          image: img ? toAbsolute(img) : meta.image,
          url: u.toString(),
          type: 'product',
        }
      }
    } else if (pathParts[0] === 'user' && pathParts[1]) {
      const res = await fetch(`${API_BASE}/users/${pathParts[1]}`)
      console.log('[meta] user fetch status', res.status)
      if (res.ok) {
        const data = await res.json()
        const avatar = data.avatar_url || data.avatar || ''
        meta = {
          title: `${data.username} — профиль на remarket`,
          description: (data.description || 'Профиль пользователя на remarket.').slice(0, 180),
          image: toAbsolute(avatar) || toAbsolute('/logo.png'),
          url: u.toString(),
          type: 'profile',
        }
      }
    }
  } catch (e) {
    console.warn('OG meta fetch failed', e?.message || e)
  }

  return `
    <meta property="og:title" content="${meta.title}">
    <meta property="og:description" content="${meta.description}">
    <meta property="og:image" content="${meta.image}">
    <meta property="og:url" content="${meta.url}">
    <meta property="og:type" content="${meta.type}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${meta.title}">
    <meta name="twitter:description" content="${meta.description}">
    <meta name="twitter:image" content="${meta.image}">
  `
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
