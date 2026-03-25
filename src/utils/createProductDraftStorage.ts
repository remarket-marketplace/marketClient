export type CreateProductDraftStep = 1 | 2 | 3 | 4

export interface CreateProductDraftPayload {
  selectedCategoryId: string
  selectedSubcategoryId: string
  title: string
  description: string
  price: string
  productData: string
  count: number | ''
  autoDelivery: boolean
  draftImages: string[]
  images: File[]
  currentStep: CreateProductDraftStep
  isRaikaDraftApplied: boolean
}

export interface CreateProductDraftRecord extends CreateProductDraftPayload {
  updatedAt: string
}

interface CreateProductDraftMeta extends Omit<CreateProductDraftRecord, 'images'> {
  version: 1
}

const DRAFT_META_STORAGE_PREFIX = 'create-product-draft:meta:'
const DRAFT_DB_NAME = 'market-create-product-drafts'
const DRAFT_DB_VERSION = 1
const DRAFT_FILES_STORE = 'create-product-draft-files'

function getDraftMetaStorageKey(storageKey: string): string {
  return `${DRAFT_META_STORAGE_PREFIX}${storageKey}`
}

function isDraftStep(value: unknown): value is CreateProductDraftStep {
  return value === 1 || value === 2 || value === 3 || value === 4
}

function parseDraftMeta(rawValue: string | null): CreateProductDraftMeta | null {
  if (!rawValue) return null

  try {
    const parsed = JSON.parse(rawValue) as Partial<CreateProductDraftMeta> | null
    if (!parsed || typeof parsed !== 'object') return null

    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      selectedCategoryId: typeof parsed.selectedCategoryId === 'string' ? parsed.selectedCategoryId : '',
      selectedSubcategoryId: typeof parsed.selectedSubcategoryId === 'string' ? parsed.selectedSubcategoryId : '',
      title: typeof parsed.title === 'string' ? parsed.title : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      price: typeof parsed.price === 'string' ? parsed.price : '',
      productData: typeof parsed.productData === 'string' ? parsed.productData : '',
      count: typeof parsed.count === 'number' || parsed.count === '' ? parsed.count : 1,
      autoDelivery: parsed.autoDelivery !== false,
      draftImages: Array.isArray(parsed.draftImages)
        ? parsed.draftImages.filter((value): value is string => typeof value === 'string')
        : [],
      currentStep: isDraftStep(parsed.currentStep) ? parsed.currentStep : 1,
      isRaikaDraftApplied: parsed.isRaikaDraftApplied === true,
    }
  } catch {
    return null
  }
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function canUseIndexedDb(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

function openDraftDatabase(): Promise<IDBDatabase | null> {
  if (!canUseIndexedDb()) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    const request = window.indexedDB.open(DRAFT_DB_NAME, DRAFT_DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(DRAFT_FILES_STORE)) {
        database.createObjectStore(DRAFT_FILES_STORE)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

function readDraftFiles(storageKey: string): Promise<File[]> {
  return openDraftDatabase().then((database) => {
    if (!database) return []

    return new Promise((resolve) => {
      const transaction = database.transaction(DRAFT_FILES_STORE, 'readonly')
      const store = transaction.objectStore(DRAFT_FILES_STORE)
      const request = store.get(storageKey)

      request.onsuccess = () => {
        const result = request.result
        if (!Array.isArray(result)) {
          resolve([])
          return
        }

        resolve(result.filter((value): value is File => value instanceof File))
      }
      request.onerror = () => resolve([])
      transaction.oncomplete = () => database.close()
      transaction.onerror = () => database.close()
      transaction.onabort = () => database.close()
    })
  })
}

function writeDraftFiles(storageKey: string, files: File[]): Promise<void> {
  return openDraftDatabase().then((database) => {
    if (!database) return

    return new Promise<void>((resolve) => {
      const transaction = database.transaction(DRAFT_FILES_STORE, 'readwrite')
      const store = transaction.objectStore(DRAFT_FILES_STORE)

      if (files.length > 0) {
        store.put(files, storageKey)
      } else {
        store.delete(storageKey)
      }

      transaction.oncomplete = () => {
        database.close()
        resolve()
      }
      transaction.onerror = () => {
        database.close()
        resolve()
      }
      transaction.onabort = () => {
        database.close()
        resolve()
      }
    })
  })
}

export async function loadCreateProductDraft(
  storageKey: string,
): Promise<CreateProductDraftRecord | null> {
  if (!canUseLocalStorage()) return null

  const meta = parseDraftMeta(window.localStorage.getItem(getDraftMetaStorageKey(storageKey)))
  if (!meta) return null

  const images = await readDraftFiles(storageKey)

  return {
    updatedAt: meta.updatedAt,
    selectedCategoryId: meta.selectedCategoryId,
    selectedSubcategoryId: meta.selectedSubcategoryId,
    title: meta.title,
    description: meta.description,
    price: meta.price,
    productData: meta.productData,
    count: meta.count,
    autoDelivery: meta.autoDelivery,
    draftImages: meta.draftImages,
    images,
    currentStep: meta.currentStep,
    isRaikaDraftApplied: meta.isRaikaDraftApplied,
  }
}

export async function saveCreateProductDraft(
  storageKey: string,
  payload: CreateProductDraftPayload,
): Promise<CreateProductDraftRecord | null> {
  if (!canUseLocalStorage()) return null

  const updatedAt = new Date().toISOString()
  const meta: CreateProductDraftMeta = {
    version: 1,
    updatedAt,
    selectedCategoryId: payload.selectedCategoryId,
    selectedSubcategoryId: payload.selectedSubcategoryId,
    title: payload.title,
    description: payload.description,
    price: payload.price,
    productData: payload.productData,
    count: payload.count,
    autoDelivery: payload.autoDelivery,
    draftImages: payload.draftImages,
    currentStep: payload.currentStep,
    isRaikaDraftApplied: payload.isRaikaDraftApplied,
  }

  window.localStorage.setItem(getDraftMetaStorageKey(storageKey), JSON.stringify(meta))
  await writeDraftFiles(storageKey, payload.images)

  return {
    ...payload,
    updatedAt,
  }
}

export async function clearCreateProductDraft(storageKey: string): Promise<void> {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(getDraftMetaStorageKey(storageKey))
  }

  await writeDraftFiles(storageKey, [])
}
