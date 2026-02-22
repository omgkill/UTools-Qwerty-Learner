export function parseMdxEntry(html: string): { translations: string[]; phonetics: { us?: string; uk?: string }; tense?: string } {
  const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null
  if (!parser) {
    return { translations: [], phonetics: {} }
  }

  const doc = parser.parseFromString(html, 'text/html')
  const ipaText = doc.querySelector('#ecdict .git .ipa')?.textContent?.trim() || ''
  const phonetic = normalizePhonetic(ipaText)

  const translations = Array.from(doc.querySelectorAll('#ecdict .gdc .dcb'))
    .map((block) => {
      const pos = block.querySelector('.pos')?.textContent?.trim()
      const dcn = block.querySelector('.dcn')?.textContent?.trim()
      if (!dcn) return null
      const text = pos ? `${pos} ${dcn}` : dcn
      return text.replace(/\s+/g, ' ').trim()
    })
    .filter((item): item is string => Boolean(item))

  const unique = Array.from(new Set(translations.map((item) => item.replace(/^[·•\-\s]+/g, '').trim())))
    .filter((item) => item.length > 1 && item.length < 120)
    .filter((item) => /[\u4e00-\u9fa5]/.test(item))

  const tense = doc.querySelector('#ecdict .gfm .frm')?.textContent?.trim()

  return {
    translations: unique.slice(0, 2),
    phonetics: { uk: phonetic || undefined },
    tense: tense || undefined,
  }
}

function normalizePhonetic(text: string): string {
  return text.replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim()
}
