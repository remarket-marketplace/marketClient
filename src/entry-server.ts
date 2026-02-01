import { renderToString } from 'vue/server-renderer'
import { createVueApp } from './app'

function renderPreloadLinks(modules: Set<string>, manifest: Record<string, string[]>) {
  let links = ''
  const seen = new Set<string>()

  modules.forEach((id) => {
    const files = manifest[id]
    if (!files) return
    files.forEach((file) => {
      if (seen.has(file)) return
      seen.add(file)
      if (file.endsWith('.js')) {
        links += `<link rel="modulepreload" crossorigin href="${file}">`
      } else if (file.endsWith('.css')) {
        links += `<link rel="stylesheet" href="${file}">`
      }
    })
  })
  return links
}

export async function render(url: string, manifest?: Record<string, string[]>) {
  const { app, router } = createVueApp(true)
  await router.push(url)
  await router.isReady()

  const ctx: any = {}
  const html = await renderToString(app, ctx)
  const preloadLinks = manifest && ctx.modules ? renderPreloadLinks(ctx.modules, manifest) : ''

  return { html, preloadLinks }
}
