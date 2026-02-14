import styles from './index.module.css'
import { pronunciationConfigAtom } from '@/store'
import { toFixedNumber } from '@/utils'
import { Switch } from '@headlessui/react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import * as Slider from '@radix-ui/react-slider'
import { useAtom } from 'jotai'
import { useCallback } from 'react'

export default function SoundSetting() {
  const [pronunciationConfig, setPronunciationConfig] = useAtom(pronunciationConfigAtom)

  const onTogglePronunciation = useCallback(
    (checked: boolean) => {
      setPronunciationConfig((prev) => ({
        ...prev,
        isOpen: checked,
      }))
    },
    [setPronunciationConfig],
  )
  const onTogglePronunciationIsTransRead = useCallback(
    (checked: boolean) => {
      setPronunciationConfig((prev) => ({
        ...prev,
        isTransRead: checked,
      }))
    },
    [setPronunciationConfig],
  )
  const onChangePronunciationVolume = useCallback(
    (value: [number]) => {
      setPronunciationConfig((prev) => ({
        ...prev,
        volume: value[0] / 100,
      }))
    },
    [setPronunciationConfig],
  )
  const onChangePronunciationIsTransVolume = useCallback(
    (value: [number]) => {
      setPronunciationConfig((prev) => ({
        ...prev,
        transVolume: value[0] / 100,
      }))
    },
    [setPronunciationConfig],
  )
  const onChangePronunciationRate = useCallback(
    (value: [number]) => {
      setPronunciationConfig((prev) => ({
        ...prev,
        rate: value[0],
      }))
    },
    [setPronunciationConfig],
  )

  return (
    <ScrollArea.Root className="flex-1 select-none overflow-y-auto ">
      <ScrollArea.Viewport className="h-full w-full px-3">
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>单词发音</span>
            <div className={styles.switchBlock}>
              <Switch checked={pronunciationConfig.isOpen} onChange={onTogglePronunciation} className="switch-root">
                <span aria-hidden="true" className="switch-thumb" />
              </Switch>
              <span className="text-right text-xs font-normal leading-tight text-gray-600">{`发音已${
                pronunciationConfig.isOpen ? '开启' : '关闭'
              }`}</span>
            </div>
            <div className={styles.block}>
              <span className={styles.blockLabel}>音量</span>
              <div className="flex h-5 w-full items-center justify-between">
                <Slider.Root
                  defaultValue={[pronunciationConfig.volume * 100]}
                  max={100}
                  step={10}
                  className="slider"
                  onValueChange={onChangePronunciationVolume}
                  disabled={!pronunciationConfig.isOpen}
                >
                  <Slider.Track>
                    <Slider.Range />
                  </Slider.Track>
                  <Slider.Thumb />
                </Slider.Root>
                <span className="ml-4 w-10 text-xs font-normal text-gray-600">{`${Math.floor(pronunciationConfig.volume * 100)}%`}</span>
              </div>
            </div>

            <div className={styles.block}>
              <span className={styles.blockLabel}>倍速</span>
              <div className="flex h-5 w-full items-center justify-between">
                <Slider.Root
                  defaultValue={[pronunciationConfig.rate ?? 1]}
                  max={4}
                  min={0.5}
                  step={0.1}
                  className="slider"
                  onValueChange={onChangePronunciationRate}
                  disabled={!pronunciationConfig.isOpen}
                >
                  <Slider.Track>
                    <Slider.Range />
                  </Slider.Track>
                  <Slider.Thumb />
                </Slider.Root>
                <span className="ml-4 w-10 text-xs font-normal text-gray-600">{`${toFixedNumber(pronunciationConfig.rate, 2)}`}</span>
              </div>
            </div>
          </div>
          {window.speechSynthesis && (
            <div className={styles.section}>
              <span className={styles.sectionLabel}>释义发音</span>
              <div className={styles.switchBlock}>
                <Switch checked={pronunciationConfig.isTransRead} onChange={onTogglePronunciationIsTransRead} className="switch-root">
                  <span aria-hidden="true" className="switch-thumb" />
                </Switch>
                <span className="text-right text-xs font-normal leading-tight text-gray-600">{`发音已${
                  pronunciationConfig.isTransRead ? '开启' : '关闭'
                }`}</span>
              </div>
              <div className={styles.block}>
                <span className={styles.blockLabel}>音量</span>
                <div className="flex h-5 w-full items-center justify-between">
                  <Slider.Root
                    defaultValue={[pronunciationConfig.transVolume * 100]}
                    max={100}
                    step={10}
                    className="slider"
                    onValueChange={onChangePronunciationIsTransVolume}
                  >
                    <Slider.Track>
                      <Slider.Range />
                    </Slider.Track>
                    <Slider.Thumb />
                  </Slider.Root>
                  <span className="ml-4 w-10 text-xs font-normal text-gray-600">{`${Math.floor(
                    pronunciationConfig.transVolume * 100,
                  )}%`}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex touch-none select-none bg-transparent " orientation="vertical"></ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )
}
