type DraftRecord = {
  initial: unknown
  value: unknown
}

const drafts = new Map<string, DraftRecord>()
const sensitiveDraftFields = new Set(['password', 'confirm_password'])

export function cloneDraftValue<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== 'object') return value
  if (typeof File !== 'undefined' && value instanceof File) return value
  if (value instanceof Date) return new Date(value.getTime()) as T

  const known = seen.get(value)
  if (known) return known as T

  if (Array.isArray(value)) {
    const copy: unknown[] = []
    seen.set(value, copy)
    value.forEach((item) => copy.push(cloneDraftValue(item, seen)))
    return copy as T
  }

  const copy = Object.create(Object.getPrototypeOf(value)) as Record<PropertyKey, unknown>
  seen.set(value, copy)
  Reflect.ownKeys(value).forEach((key) => {
    copy[key] = cloneDraftValue((value as Record<PropertyKey, unknown>)[key], seen)
  })
  return copy as T
}

export function draftValuesEqual(
  left: unknown,
  right: unknown,
  seen = new WeakMap<object, object>()
): boolean {
  if (Object.is(left, right)) return true
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false
  if (left instanceof Date || right instanceof Date) {
    return left instanceof Date && right instanceof Date && left.getTime() === right.getTime()
  }
  if (typeof File !== 'undefined' && (left instanceof File || right instanceof File)) {
    return left instanceof File
      && right instanceof File
      && left.name === right.name
      && left.size === right.size
      && left.type === right.type
      && left.lastModified === right.lastModified
  }
  if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) return false
  if (seen.get(left) === right) return true
  seen.set(left, right)

  const leftKeys = Reflect.ownKeys(left)
  const rightKeys = Reflect.ownKeys(right)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every((key) =>
    Object.prototype.hasOwnProperty.call(right, key)
    && draftValuesEqual(
      (left as Record<PropertyKey, unknown>)[key],
      (right as Record<PropertyKey, unknown>)[key],
      seen
    )
  )
}

export function restoreDraftState(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  primitiveSetters: Record<string, ((value: any) => void) | undefined> = {}
) {
  Object.keys(source).forEach((key) => {
    const current = target[key]
    const saved = cloneDraftValue(source[key])
    // A caller-supplied setter always wins: patching an object in place would
    // mutate whatever the live ref currently aliases (e.g. a Pinia store item).
    const setter = primitiveSetters[key]
    if (setter) {
      setter(saved)
      return
    }
    if (current && typeof current === 'object' && saved && typeof saved === 'object') {
      if (Array.isArray(current) && Array.isArray(saved)) {
        current.splice(0, current.length, ...saved)
      } else {
        const currentRecord = current as Record<string, unknown>
        const savedRecord = saved as Record<string, unknown>
        Object.keys(currentRecord).forEach((field) => {
          if (!Object.prototype.hasOwnProperty.call(savedRecord, field)) delete currentRecord[field]
        })
        Object.assign(currentRecord, savedRecord)
      }
    }
  })
}

export function saveSlidePanelDraft(key: string, record: DraftRecord) {
  drafts.set(key, {
    initial: sanitizeDraftValue(record.initial),
    value: sanitizeDraftValue(record.value)
  })
}

function sanitizeDraftValue<T>(value: T): T {
  const copy = cloneDraftValue(value)
  const visit = (current: unknown) => {
    if (!current || typeof current !== 'object' || current instanceof Date || (typeof File !== 'undefined' && current instanceof File)) return
    Object.keys(current).forEach((key) => {
      if (sensitiveDraftFields.has(key)) (current as Record<string, unknown>)[key] = ''
      else visit((current as Record<string, unknown>)[key])
    })
  }
  visit(copy)
  return copy
}

export function takeSlidePanelDraft(key: string) {
  const record = drafts.get(key)
  drafts.delete(key)
  return record
}

export function deleteSlidePanelDraft(key: string) {
  drafts.delete(key)
}

export function clearSlidePanelDrafts() {
  drafts.clear()
}
