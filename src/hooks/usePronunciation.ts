import { pronunciationConfigAtom } from '@/store'
import type { PronunciationType } from '@/typings'
import { addHowlListener } from '@/utils'
import { LruCache } from '@/utils/cache'
import { Howl } from 'howler'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const pronunciationApi = 'https://dict.youdao.com/dictvoice?audio='
const SOUND_CACHE_LIMIT = 50

const pronunciationSoundCache = new LruCache<string, Howl>(SOUND_CACHE_LIMIT)
export function generateWordSoundSrc(word: string, pronunciation: Exclude<PronunciationType, false>) {
  switch (pronunciation) {
    case 'uk':
      return `${pronunciationApi}${word}&type=1`
    case 'us':
      return `${pronunciationApi}${word}&type=2`
  }
}

export default function usePronunciationSound(word: string) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const [isPlaying, setIsPlaying] = useState(false)
  const soundUrl = useMemo(() => generateWordSoundSrc(word, pronunciationConfig.type), [word, pronunciationConfig.type])

  const soundRef = useRef<Howl | null>(null)
  const [sound, setSound] = useState<Howl | null>(() => {
    const cached = pronunciationSoundCache.get(soundUrl)
    if (cached) {
      soundRef.current = cached
      return cached
    }
    return null
  })

  useEffect(() => {
    const cached = pronunciationSoundCache.get(soundUrl)
    if (cached) {
      soundRef.current = cached
      setSound(cached)
      return
    }
    const newSound = new Howl({
      src: [soundUrl],
      html5: true,
      format: ['mp3'],
      loop: false,
      volume: pronunciationConfig.volume,
      rate: pronunciationConfig.rate,
    })
    pronunciationSoundCache.set(soundUrl, newSound, (evicted) => evicted.unload())
    soundRef.current = newSound
    setSound(newSound)
  }, [soundUrl, pronunciationConfig.rate, pronunciationConfig.volume])

  useEffect(() => {
    const currentSound = soundRef.current
    if (!currentSound) return
    const unListens: Array<() => void> = []

    unListens.push(addHowlListener(currentSound, 'play', () => setIsPlaying(true)))
    unListens.push(addHowlListener(currentSound, 'end', () => setIsPlaying(false)))
    unListens.push(addHowlListener(currentSound, 'pause', () => setIsPlaying(false)))
    unListens.push(addHowlListener(currentSound, 'playerror', () => setIsPlaying(false)))

    return () => {
      setIsPlaying(false)
      unListens.forEach((unListen) => unListen())
    }
  }, [sound])

  useEffect(() => {
    const currentSound = soundRef.current
    if (!currentSound) return
    currentSound.volume(pronunciationConfig.volume)
    currentSound.rate(pronunciationConfig.rate)
  }, [sound, pronunciationConfig.rate, pronunciationConfig.volume])

  const play = useCallback(() => {
    const currentSound = soundRef.current
    if (!currentSound) return
    currentSound.stop()
    currentSound.volume(pronunciationConfig.volume)
    currentSound.rate(pronunciationConfig.rate)
    currentSound.play()
  }, [pronunciationConfig.rate, pronunciationConfig.volume])

  const stop = useCallback(() => {
    const currentSound = soundRef.current
    if (!currentSound) return
    currentSound.stop()
    setIsPlaying(false)
  }, [])

  return { play, stop, isPlaying }
}

export function usePrefetchPronunciationSound(word: string | undefined) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)

  useEffect(() => {
    if (!word) return
    const soundUrl = generateWordSoundSrc(word, pronunciationConfig.type)
    const cached = pronunciationSoundCache.get(soundUrl)
    if (cached) return
    const newSound = new Howl({
      src: [soundUrl],
      html5: true,
      format: ['mp3'],
      loop: false,
      volume: pronunciationConfig.volume,
      rate: pronunciationConfig.rate,
    })
    pronunciationSoundCache.set(soundUrl, newSound, (evicted) => evicted.unload())
  }, [pronunciationConfig.rate, pronunciationConfig.type, pronunciationConfig.volume, word])
}
