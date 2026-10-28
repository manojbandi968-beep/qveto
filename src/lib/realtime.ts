export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'unavailable'

/**
 * Creates a debounced function that delays invoking the callback
 * until after `delayMs` milliseconds have elapsed since the last call.
 */
export function createDebounce<T extends (...args: unknown[]) => void>(
  callback: T,
  delayMs = 300
): { trigger: (...args: Parameters<T>) => void; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const trigger = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      callback(...args)
      timeoutId = null
    }, delayMs)
  }

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return { trigger, cancel }
}

