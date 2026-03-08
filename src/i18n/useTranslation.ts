// useTranslation.ts — hook that reads `language` from the store and returns a t(key) function
// Supports {placeholder} interpolation: t('key', { count: 3 }) → replaces {count} with "3"

import { useBibleStore } from '../store/bibleStore'
import { translations, TranslationKey } from './translations'

export function useTranslation() {
  const language = useBibleStore((s) => s.language)

  // Fall back to English if a key is missing in the active language
  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    const map = translations[language] ?? translations['en']
    let str: string = map[key] ?? translations['en'][key] ?? key

    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, String(v))
      }
    }

    return str
  }

  return { t, language }
}
