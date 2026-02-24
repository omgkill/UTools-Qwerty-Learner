import type { WritableAtom } from 'jotai'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { RESET } from 'jotai/vanilla/utils/constants'

type SetStateActionWithReset<Value> = Value | typeof RESET | ((prev: Value) => Value | typeof RESET)

export default function atomForConfig<T extends Record<string, unknown>>(
  key: string,
  defaultValue: T,
): WritableAtom<T, [SetStateActionWithReset<T>], void> {
  const storageAtom = atomWithStorage(key, defaultValue)

  const derivedAtom = atom(
    (get) => {
      // Get the underlying object
      const config = get(storageAtom)

      // Check if the types are different
      const isTypeMismatch = typeof config !== typeof defaultValue
      if (isTypeMismatch) return defaultValue

      // Check if there are missing properties
      let hasMissingProperty = false
      for (const k in defaultValue) {
        if (!(k in config)) {
          hasMissingProperty = true
          break
        }
      }

      // 纯计算，不在 getter 中写 localStorage（getter 必须是纯函数）
      return hasMissingProperty ? { ...defaultValue, ...config } : config
    },
    (get, set, update: SetStateActionWithReset<T>) => {
      // 写操作时同步修复缺失字段再写入
      const config = get(storageAtom)
      const isTypeMismatch = typeof config !== typeof defaultValue

      let base: T
      if (isTypeMismatch) {
        base = defaultValue
      } else {
        let hasMissingProperty = false
        for (const k in defaultValue) {
          if (!(k in config)) {
            hasMissingProperty = true
            break
          }
        }
        base = hasMissingProperty ? { ...defaultValue, ...config } : config
      }

      // 如果当前值已经被修复过但 storageAtom 中还是旧值，先同步
      if (base !== config) {
        set(storageAtom, base)
      }

      storageAtom.write(get, set, update)
    },
  )

  return derivedAtom
}
