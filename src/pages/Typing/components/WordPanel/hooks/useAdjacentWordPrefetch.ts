import { usePrefetchPronunciationSound } from '@/hooks/usePronunciation'

type UseAdjacentWordPrefetchParams = {
  currentWordName: string | undefined
  prevWordName: string | undefined
  nextWordName: string | undefined
}

export function useAdjacentWordPrefetch(params: UseAdjacentWordPrefetchParams) {
  const { currentWordName, prevWordName, nextWordName } = params

  usePrefetchPronunciationSound(currentWordName)
  usePrefetchPronunciationSound(prevWordName)
  usePrefetchPronunciationSound(nextWordName)
}
