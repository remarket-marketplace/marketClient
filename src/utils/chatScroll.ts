type StopFn = () => void

function getBottomScrollTop(element: HTMLElement): number {
  return Math.max(0, element.scrollHeight - element.clientHeight)
}

export function createBottomPinController(
  getContainer: () => HTMLElement | null,
) {
  let stopActivePin: StopFn | null = null

  const scrollNow = () => {
    const container = getContainer()
    if (!container) return
    const previousBehavior = container.style.scrollBehavior
    container.style.scrollBehavior = 'auto'
    container.scrollTop = getBottomScrollTop(container)
    container.style.scrollBehavior = previousBehavior
  }

  const pinFor = (durationMs = 1400): Promise<void> => {
    stopActivePin?.()

    const container = getContainer()
    if (!container) return Promise.resolve()

    let isActive = true
    const seenImages = new WeakSet<HTMLImageElement>()
    const previousBehavior = container.style.scrollBehavior
    const previousOverflowAnchor = container.style.overflowAnchor
    const timeoutIds: number[] = []
    let rafId: number | null = null
    let stopTimerId: number | null = null

    container.style.scrollBehavior = 'auto'
    container.style.overflowAnchor = 'none'

    const maxDuration = Math.max(300, durationMs)
    let resolveDone: (() => void) | null = null
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve
    })

    const forceScrollToBottom = () => {
      container.scrollTop = getBottomScrollTop(container)
    }

    const stop = () => {
      if (!isActive) return

      forceScrollToBottom()
      isActive = false
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      if (stopTimerId !== null) {
        clearTimeout(stopTimerId)
        stopTimerId = null
      }
      for (const timeoutId of timeoutIds) {
        clearTimeout(timeoutId)
      }
      mutationObserver.disconnect()
      resizeObserver?.disconnect()
      container.style.scrollBehavior = previousBehavior
      container.style.overflowAnchor = previousOverflowAnchor
      resolveDone?.()
      resolveDone = null
    }

    const applyScroll = () => {
      if (!isActive) return
      container.scrollTop = getBottomScrollTop(container)
    }

    const scheduleApplyScroll = () => {
      if (!isActive) return
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        applyScroll()
      })
    }

    const markSignal = () => {
      scheduleApplyScroll()
    }

    const bindImageListeners = () => {
      const images = container.querySelectorAll('img')
      for (const image of images) {
        if (seenImages.has(image)) continue
        seenImages.add(image)
        image.addEventListener('load', markSignal, { once: true })
        image.addEventListener('error', markSignal, { once: true })
      }
    }

    bindImageListeners()

    const mutationObserver = new MutationObserver(() => {
      bindImageListeners()
      markSignal()
    })
    mutationObserver.observe(container, { childList: true, subtree: true })

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        markSignal()
      })
      resizeObserver.observe(container)
    }

    const pulses = [0, 16, 48, 96, 160, 240, 360, 520, 760, 1040, 1320]
    for (const delay of pulses) {
      if (delay > maxDuration) break
      timeoutIds.push(window.setTimeout(() => {
        applyScroll()
      }, delay))
    }

    stopTimerId = window.setTimeout(() => {
      stop()
    }, maxDuration)

    stopActivePin = stop
    applyScroll()
    scheduleApplyScroll()
    return done
  }

  const stop = () => {
    stopActivePin?.()
    stopActivePin = null
  }

  return {
    scrollNow,
    pinFor,
    stop,
  }
}
