import fs from 'fs'
import path from 'path'
import express from 'express'
import compression from 'compression'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const resolve = (p) => path.resolve(__dirname, p)
const isProd = process.env.NODE_ENV === 'production'
const PORT = process.env.PORT || 4173

async function createServer() {
  const app = express()
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
  }

  app.use('*', async (req, res, next) => {
    try {
      const url = req.originalUrl

      let template
      let render
      let manifest

      if (!isProd) {
        template = fs.readFileSync(resolve('index.html'), 'utf-8')
        template = await vite.transformIndexHtml(url, template)
        render = (await vite.ssrLoadModule('/src/entry-server.ts')).render
      } else {
        template = fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
        manifest = JSON.parse(fs.readFileSync(resolve('dist/client/ssr-manifest.json'), 'utf-8'))
        render = (await import('./dist/server/entry-server.js')).render
      }

      const { html, preloadLinks } = await render(url, manifest)
      const htmlResp = template
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
