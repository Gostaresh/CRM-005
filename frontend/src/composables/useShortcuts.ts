// src/composables/useShortcuts.ts
// -----------------------------------------------------------------------------
// Simple composable to register global keyboard shortcuts.
// Pass a map where the key is a human‑readable combo (e.g. "Shift+ArrowRight")
// and the value is the handler function.
// Example:
//   useShortcuts({
//     N: () => console.log('new'),
//     'Shift+ArrowRight': () => console.log('next')
//   });
// -----------------------------------------------------------------------------
import { onMounted, onBeforeUnmount } from 'vue'

type Handler = (ev: KeyboardEvent) => void

function parseCombo(combo: string) {
  const parts = combo.toLowerCase().split('+')
  return {
    shift: parts.includes('shift'),
    ctrl: parts.includes('ctrl') || parts.includes('cmd') || parts.includes('meta'),
    key: parts.pop()!, // last part is the key itself
  }
}

export function useShortcuts(bindings: Record<string, () => void>) {
  const parsed = Object.entries(bindings).map(([combo, fn]) => ({
    combo: parseCombo(combo),
    fn,
  }))

  const listener: Handler = (e) => {
    // ignore when focus is inside interactive fields
    const tag = (e.target as HTMLElement)?.tagName
    if (tag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

    parsed.forEach(({ combo, fn }) => {
      if (
        combo.shift === e.shiftKey &&
        combo.ctrl === (e.ctrlKey || e.metaKey) &&
        combo.key === e.key.toLowerCase()
      ) {
        e.preventDefault()
        fn()
      }
    })
  }

  onMounted(() => window.addEventListener('keydown', listener))
  onBeforeUnmount(() => window.removeEventListener('keydown', listener))
}
