import { pronunciationConfigAtom } from '@/store'
import type { PronunciationType } from '@/typings'
import { addHowlListener } from '@/utils'
import { Howl } from 'howler'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useState } from 'react'

const pronunciationApi = 'https://dict.youdao.com/dictvoice?audio='
const SOUND_CACHE_LIMIT = 50

class LruCache<K, V> {
  private limit: number
  private map: Map<K, V>

  constructor(limit: number) {
    this.limit = limit
    this.map = new Map()
  }

  get(key: K): V | undefined {
    const value = this.map.get(key)
    if (!value) return undefined
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set(key: K, value: V, onEvict?: (value: V) => void): void {
    if (this.map.has(key)) {
      this.map.delete(key)
    }
    this.map.set(key, value)
    if (this.map.size > this.limit) {
      const firstKey = this.map.keys().next().value as K
      const firstValue = this.map.get(firstKey)
      this.map.delete(firstKey)
      if (firstValue && onEvict) {
        onEvict(firstValue)
      }
    }
  }
}

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
  const [sound, setSound] = useState<Howl | null>(null)

  useEffect(() => {
    const cached = pronunciationSoundCache.get(soundUrl)
    if (cached) {
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
    setSound(newSound)
  }, [soundUrl])

  useEffect(() => {
    if (!sound) return
    const unListens: Array<() => void> = []

    unListens.push(addHowlListener(sound, 'play', () => setIsPlaying(true)))
    unListens.push(addHowlListener(sound, 'end', () => setIsPlaying(false)))
    unListens.push(addHowlListener(sound, 'pause', () => setIsPlaying(false)))
    unListens.push(addHowlListener(sound, 'playerror', () => setIsPlaying(false)))

    return () => {
      setIsPlaying(false)
      unListens.forEach((unListen) => unListen())
    }
  }, [sound])

  useEffect(() => {
    if (!sound) return
    sound.volume(pronunciationConfig.volume)
    sound.rate(pronunciationConfig.rate)
  }, [sound, pronunciationConfig.rate, pronunciationConfig.volume])

  const play = useCallback(() => {
    if (!sound) return
    sound.volume(pronunciationConfig.volume)
    sound.rate(pronunciationConfig.rate)
    sound.play()
  }, [sound, pronunciationConfig.rate, pronunciationConfig.volume])

  const stop = useCallback(() => {
    if (!sound) return
    sound.stop()
    setIsPlaying(false)
  }, [sound])

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
