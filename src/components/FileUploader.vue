<script setup lang="ts">
import { ref, watch } from 'vue'
import { Upload, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: File[]
  maxFiles?: number // максимальное количество изображений
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: File[]): void
}>()

const previews = ref<string[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const errorMessage = ref('')

/* Генерация превью */
watch(
  () => props.modelValue,
  (newFiles) => {
    previews.value = []
    for (const file of newFiles) {
      const reader = new FileReader()
      reader.onload = (e) => {
        previews.value.push(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  },
  { immediate: true }
)

/* Добавление новых файлов */
function addFiles(files: File[]) {
  const validFiles = files.filter((f) => f.type.startsWith('image/'))

  if (props.maxFiles) {
    const remaining = props.maxFiles - props.modelValue.length
    if (remaining <= 0) {
      errorMessage.value = `Максимум ${props.maxFiles} изображений`
      return
    }
    validFiles.splice(remaining)
  }

  const updated = [...props.modelValue, ...validFiles]
  emit('update:modelValue', updated)
  errorMessage.value = ''
}

/* Drag’n’drop и input */
function handleDrop(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer?.files) {
    addFiles(Array.from(event.dataTransfer.files))
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
}

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    addFiles(Array.from(target.files))
  }
}

/* Удаление файла */
function removeImage(index: number) {
  const updated = [...props.modelValue]
  updated.splice(index, 1)
  emit('update:modelValue', updated)
}
</script>

<template>
  <div class="w-full">
    <!-- Зона загрузки -->
    <div
      class="border-2 border-dashed border-dark-700 rounded-xl bg-dark-600 hover:border-blue-500 transition-colors cursor-pointer flex flex-col items-center justify-center p-6 text-center"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @click="fileInput?.click()"
    >
      <Upload class="w-8 h-8 text-gray-400 mb-2" />
      <p class="text-gray-400">{{ $t('components.fileUploader.upload') }}</p>
      <p class="text-sm text-gray-500 mt-1">{{ $t('components.fileUploader.supportOnlyImages') }}</p>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="hidden"
        @change="handleChange"
      />
    </div>

    <!-- Сообщение об ошибке -->
    <p v-if="errorMessage" class="text-sm text-red-500 mt-2">{{ errorMessage }}</p>

    <!-- Превью изображений -->
    <div v-if="previews.length" class="mt-4 grid grid-cols-3 gap-3">
      <div
        v-for="(src, index) in previews"
        :key="index"
        class="relative rounded-lg overflow-hidden border border-dark-700"
      >
        <img :src="src" alt="Preview" class="object-cover w-full h-24 rounded-md" />
        <button
          type="button"
          class="absolute top-1 right-1 bg-dark-700/70 hover:bg-red-600 text-white p-1 rounded-full transition"
          @click.stop="removeImage(index)"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>