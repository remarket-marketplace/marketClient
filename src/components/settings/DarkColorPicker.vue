<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  swatches?: readonly string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const saturationRef = ref<HTMLElement | null>(null)
const hueRef = ref<HTMLElement | null>(null)
const hue = ref(0)
const saturation = ref(1)
const value = ref(1)
const isDraggingSaturation = ref(false)
const isDraggingHue = ref(false)

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function clamp255(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(255, Math.max(0, Math.round(value)))
}

function toHex(value: number): string {
  return clamp255(value).toString(16).padStart(2, '0')
}

function normalizeHex(value: string): string {
  const normalized = value.trim().toLowerCase()
  const match = normalized.match(/^#([0-9a-f]{6})$/)
  if (!match) return '#ffffff'
  return `#${match[1]}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex).slice(1)
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function rgbToHsv(rRaw: number, gRaw: number, bRaw: number): { h: number; s: number; v: number } {
  const r = clamp255(rRaw) / 255
  const g = clamp255(gRaw) / 255
  const b = clamp255(bRaw) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  const s = max === 0 ? 0 : delta / max
  const v = max
  return { h, s, v }
}

function hsvToRgb(hRaw: number, sRaw: number, vRaw: number): { r: number; g: number; b: number } {
  const h = ((hRaw % 360) + 360) % 360
  const s = clamp01(sRaw)
  const v = clamp01(vRaw)

  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c

  let rPrime = 0
  let gPrime = 0
  let bPrime = 0

  if (h < 60) {
    rPrime = c
    gPrime = x
  } else if (h < 120) {
    rPrime = x
    gPrime = c
  } else if (h < 180) {
    gPrime = c
    bPrime = x
  } else if (h < 240) {
    gPrime = x
    bPrime = c
  } else if (h < 300) {
    rPrime = x
    bPrime = c
  } else {
    rPrime = c
    bPrime = x
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  }
}

function emitCurrentColor() {
  const rgb = hsvToRgb(hue.value, saturation.value, value.value)
  emit('update:modelValue', rgbToHex(rgb.r, rgb.g, rgb.b))
}

function setFromHexColor(hexColor: string) {
  const rgb = hexToRgb(hexColor)
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
  hue.value = hsv.h
  saturation.value = hsv.s
  value.value = hsv.v
}

watch(
  () => props.modelValue,
  (nextColor) => {
    if (isDraggingHue.value || isDraggingSaturation.value) return
    setFromHexColor(nextColor)
  },
  { immediate: true },
)

const saturationBackground = computed(() => `hsl(${hue.value}deg 100% 50%)`)
const saturationCursorStyle = computed(() => ({
  left: `${saturation.value * 100}%`,
  top: `${(1 - value.value) * 100}%`,
}))
const hueCursorStyle = computed(() => ({
  left: `${(hue.value / 360) * 100}%`,
}))

function updateSaturationByEvent(event: PointerEvent) {
  const element = saturationRef.value
  if (!element) return
  const rect = element.getBoundingClientRect()
  const x = clamp01((event.clientX - rect.left) / rect.width)
  const y = clamp01((event.clientY - rect.top) / rect.height)
  saturation.value = x
  value.value = 1 - y
  emitCurrentColor()
}

function updateHueByEvent(event: PointerEvent) {
  const element = hueRef.value
  if (!element) return
  const rect = element.getBoundingClientRect()
  const x = clamp01((event.clientX - rect.left) / rect.width)
  hue.value = x * 360
  emitCurrentColor()
}

function stopDragging() {
  isDraggingHue.value = false
  isDraggingSaturation.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', stopDragging)
}

function onPointerMove(event: PointerEvent) {
  if (isDraggingSaturation.value) updateSaturationByEvent(event)
  if (isDraggingHue.value) updateHueByEvent(event)
}

function startSaturationDrag(event: PointerEvent) {
  event.preventDefault()
  isDraggingSaturation.value = true
  updateSaturationByEvent(event)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopDragging)
}

function startHueDrag(event: PointerEvent) {
  event.preventDefault()
  isDraggingHue.value = true
  updateHueByEvent(event)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopDragging)
}

function selectSwatch(color: string) {
  const normalized = normalizeHex(color)
  setFromHexColor(normalized)
  emit('update:modelValue', normalized)
}
</script>

<template>
  <div class="w-44 rounded-lg border border-dark-600 bg-dark-900 p-2 shadow-lg">
    <div
      ref="saturationRef"
      class="relative h-24 w-full cursor-crosshair rounded-md border border-dark-600"
      :style="{ backgroundColor: saturationBackground }"
      @pointerdown="startSaturationDrag"
    >
      <div class="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-r from-white to-transparent" />
      <div class="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-t from-black to-transparent" />
      <div
        class="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
        :style="saturationCursorStyle"
      />
    </div>

    <div
      ref="hueRef"
      class="relative mt-2 h-3 w-full cursor-ew-resize rounded-full border border-dark-600 bg-[linear-gradient(90deg,#ff0000_0%,#ffff00_16.66%,#00ff00_33.33%,#00ffff_50%,#0000ff_66.66%,#ff00ff_83.33%,#ff0000_100%)]"
      @pointerdown="startHueDrag"
    >
      <div
        class="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-dark-900"
        :style="hueCursorStyle"
      />
    </div>

    <div class="mt-2 grid grid-cols-6 gap-1.5">
      <button
        v-for="swatch in (props.swatches ?? [])"
        :key="swatch"
        type="button"
        class="h-5 w-5 rounded-sm border border-dark-500 transition hover:border-blue-400/70"
        :style="{ backgroundColor: swatch }"
        :title="swatch"
        @click="selectSwatch(swatch)"
      >
      </button>
    </div>
  </div>
</template>
