<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Upload, Trash2, Image, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  modelValue: File[]
  maxFiles?: number
  label?: string
  hint?: string
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: File[]): void
}>()
const { t } = useI18n()

type PreviewItem = {
  id: string
  file: File
  src: string
}

const previews = ref<PreviewItem[]>([])

const fileInput = ref<HTMLInputElement | null>(null)
const errorMessage = ref('')
const isDragging = ref(false)
const maxFiles = props.maxFiles || 8

// Компьютед свойства
const filesCount = computed(() => props.modelValue.length)
const canAddMore = computed(() => maxFiles === undefined || filesCount.value < maxFiles)
const remainingSlots = computed(() => maxFiles - filesCount.value)
const isSingleFileMode = computed(() => maxFiles === 1)

watch(
  () => props.modelValue,
  (files) => {
    previews.value = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      src: URL.createObjectURL(file),
    }))
  },
  { immediate: true }
)

// Добавление новых файлов
function addFiles(files: File[]) {
  const validFiles = files.filter((f) => f.type.startsWith('image/'))

  if (!validFiles.length) {
    errorMessage.value = t('components.fileUploader.errorOnlyImages')
    return
  }

  if (maxFiles) {
    const remaining = maxFiles - props.modelValue.length
    if (remaining <= 0) {
      errorMessage.value = t('components.fileUploader.errorMaxFiles', { maxFiles })
      return
    }
    validFiles.splice(remaining)
  }

  const updated = [...props.modelValue, ...validFiles]
  emit('update:modelValue', updated)
  errorMessage.value = ''
}

// Drag and drop
function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
  if (event.dataTransfer?.files) {
    addFiles(Array.from(event.dataTransfer.files))
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
}

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    addFiles(Array.from(target.files))
  }
  // Сбрасываем значение инпута, чтобы можно было загрузить тот же файл снова
  target.value = ''
}

// Clipboard paste
function getClipboardFiles(data: DataTransfer | null): File[] {
  if (!data) return []

  const fromFiles = Array.from(data.files || [])
  if (fromFiles.length) return fromFiles

  return Array.from(data.items || [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null)
}

function handlePaste(event: ClipboardEvent) {
  const files = getClipboardFiles(event.clipboardData)
  if (!files.length) return

  event.preventDefault()
  addFiles(files)
}

// Удаление файла
function removeImage(index: number) {
  const updated = [...props.modelValue]
  updated.splice(index, 1)
  emit('update:modelValue', updated)
}

// Очистить все файлы
function clearAll() {
  emit('update:modelValue', [])
}
</script>

<template>
  <div
    class="w-full space-y-3"
    :class="{ 'single-file-mode': isSingleFileMode }"
    tabindex="0"
    @paste="handlePaste"
  >
    <!-- Заголовок и счетчик -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-gray-300">
          {{ label || $t('common.images') }}
        </label>
        <span v-if="maxFiles" class="text-xs text-gray-400">
          ({{ filesCount }}/{{ maxFiles }})
        </span>
      </div>
      <button
        v-if="filesCount > 0"
        type="button"
        @click="clearAll"
        class="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
      >
        <X class="w-3 h-3" />
        {{ $t('components.fileUploader.clearAll') }}
      </button>
    </div>

    <!-- Контейнер для превью и кнопки загрузки -->
    <div 
      class="grid gap-3"
      :class="[
        isSingleFileMode 
          ? 'grid-cols-1 max-w-xs mx-auto' 
          : 'file-uploader-grid'
      ]"
      @dragover="isSingleFileMode ? handleDragOver : null"
      @dragleave="isSingleFileMode ? handleDragLeave : null"
      @drop="isSingleFileMode ? handleDrop : null"
    >
      <!-- Превью изображений -->
      <div
        v-for="(item, index) in previews"
        :key="item.id"
        class="group relative rounded-lg overflow-hidden border border-dark-700 bg-dark-600 transition-all duration-200 hover:border-blue-500"
        :class="isSingleFileMode ? 'w-full' : 'aspect-square'"
      >
        <img 
          :src="item.src"
          :alt="`Изображение ${index + 1}`" 
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          :class="isSingleFileMode ? 'max-h-64' : ''"
        />
        
        <!-- Номер изображения -->
        <div class="absolute top-2 left-2 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded">
          {{ index + 1 }}
        </div>
        
        <!-- Кнопка удаления -->
        <button
          type="button"
          @click.stop="removeImage(index)"
          class="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
          :title="$t('common.delete')"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
        
        <!-- Затемнение при наведении -->
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 pointer-events-none"></div>
      </div>

      <!-- Кнопка загрузки (показывается если есть свободные слоты) -->
      <div
        v-if="canAddMore"
        :class="isSingleFileMode ? 'w-full' : 'aspect-square'"
        @dragover="!isSingleFileMode ? handleDragOver : null"
        @dragleave="!isSingleFileMode ? handleDragLeave : null"
        @drop="!isSingleFileMode ? handleDrop : null"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          :multiple="!isSingleFileMode"
          class="hidden"
          @change="handleChange"
        />
        
        <!-- Кнопка загрузки -->
        <button
          type="button"
          @click="fileInput?.click()"
          class="w-full h-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200 p-3 sm:p-4"
          :class="[
            isDragging 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-dark-700 hover:border-blue-500 hover:bg-blue-700',
            isSingleFileMode ? 'min-h-32' : ''
          ]"
          :title="$t('components.fileUploader.upload')"
        >
          <!-- Иконка -->
          <div class="mb-2 sm:mb-3">
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-dark-700 flex items-center justify-center">
              <Upload 
                class="w-5 h-5 sm:w-6 sm:h-6" 
                :class="isDragging ? 'text-blue-400' : 'text-gray-400'" 
              />
            </div>
          </div>
          
          <!-- Текст -->
          <div class="text-center leading-tight">
            <span class="text-xs sm:text-sm font-medium block break-words" :class="isDragging ? 'text-blue-400' : 'text-gray-400'">
              {{ $t('components.fileUploader.addPhoto') }}
            </span>
            <span v-if="isSingleFileMode" class="text-xs text-gray-500 mt-1 block">
              {{ $t('components.fileUploader.singleFileHint') }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- Хинт под кнопкой -->
    <div v-if="hint" class="text-xs text-gray-400">
      {{ hint }}
    </div>
    
    <!-- Сообщение об ошибке -->
    <div v-if="errorMessage" class="text-sm text-red-500 mt-2 flex items-center gap-2">
      <div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>
      {{ errorMessage }}
    </div>

    <!-- Информация о поддерживаемых форматах -->
    <div class="text-xs text-gray-400 flex items-center gap-1">
      <Image class="w-3 h-3" />
      {{ $t('components.fileUploader.supportOnlyImages') }}
    </div>
    <div class="text-xs text-gray-400">
      {{ $t('components.fileUploader.pasteHint') }}
    </div>
  </div>
</template>

<style scoped>
/* Плавные анимации */
.group {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Кастомный скролл для контейнера с превью */
.grid {
  scrollbar-width: thin;
  scrollbar-color: var(--overlay-white-20) transparent;
}

.grid::-webkit-scrollbar {
  height: 6px;
}

.grid::-webkit-scrollbar-track {
  background: transparent;
}

.grid::-webkit-scrollbar-thumb {
  background-color: var(--overlay-white-20);
  border-radius: 3px;
}

/* Эффект при наведении на изображение */
img {
  will-change: transform;
}

/* Специальные стили для режима одного файла */
.single-file-mode .grid {
  max-width: 100%;
}

/* Adaptive grid for multi-image mode: keeps cards readable in narrow columns. */
.file-uploader-grid {
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
}
</style>
