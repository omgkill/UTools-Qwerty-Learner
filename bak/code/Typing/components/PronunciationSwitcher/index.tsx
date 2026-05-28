import Tooltip from '@/components/Tooltip'
import { currentWordBankAtom, phoneticConfigAtom, pronunciationConfigAtom } from '@/store'
import { Popover, Switch, Transition } from '@headlessui/react'
import { useAtom, useAtomValue } from 'jotai'
import { Fragment, useCallback, useEffect, useMemo } from 'react'

const PronunciationSwitcher = () => {
  const currentWordBank = useAtomValue(currentWordBankAtom)
  const [pronunciationConfig, setPronunciationConfig] = useAtom(pronunciationConfigAtom)
  const [phoneticConfig, setPhoneticConfig] = useAtom(phoneticConfigAtom)

  useEffect(() => {
    if (pronunciationConfig.type !== 'uk' || pronunciationConfig.name !== '英音') {
      setPronunciationConfig((old) => ({
        ...old,
        type: 'uk',
        name: '英音',
      }))
    }
  }, [currentWordBank?.defaultPronIndex, currentWordBank?.language, pronunciationConfig.name, pronunciationConfig.type, setPronunciationConfig])

  useEffect(() => {
    if (phoneticConfig.type !== 'uk') {
      setPhoneticConfig((old) => ({
        ...old,
        type: 'uk',
      }))
    }
  }, [phoneticConfig.type, setPhoneticConfig])

  const onChangePronunciationIsOpen = useCallback(
    (value: boolean) => {
      setPronunciationConfig((old) => ({
        ...old,
        isOpen: value,
      }))
    },
    [setPronunciationConfig],
  )

  const onChangePronunciationIsTransRead = useCallback(
    (value: boolean) => {
      setPronunciationConfig((old) => ({
        ...old,
        isTransRead: value,
      }))
    },
    [setPronunciationConfig],
  )

  const onChangePhoneticIsOpen = useCallback(
    (value: boolean) => {
      setPhoneticConfig((old) => ({
        ...old,
        isOpen: value,
      }))
    },
    [setPhoneticConfig],
  )

  const currentLabel = useMemo(() => {
    if (pronunciationConfig.isOpen) {
      return pronunciationConfig.name
    } else {
      return '关闭'
    }
  }, [pronunciationConfig.isOpen, pronunciationConfig.name])

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            className={`flex h-8 min-w-max cursor-pointer items-center justify-center rounded-md px-1 transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white focus:outline-none text-white text-opacity-60 hover:text-opacity-100  ${
              open ? 'bg-indigo-400 text-white' : 'bg-transparent'
            }`}
            onFocus={(e) => {
              e.target.blur()
            }}
          >
            <Tooltip content="发音及音标切换">{currentLabel}</Tooltip>
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute left-1/2 z-20 mt-2 flex max-w-max -translate-x-1/2 px-4 ">
              <div className="shadow-upper box-border flex w-60 select-none flex-col items-center justify-center gap-4 rounded-xl bg-gray-800 p-4 drop-shadow transition duration-1000 ease-in-out">
                <div className="flex w-full  flex-col  items-start gap-2 py-0">
                  <span className="text-sm font-normal leading-5 text-white text-opacity-60">开关音标显示</span>
                  <div className="flex w-full flex-row items-center justify-between">
                    <Switch checked={phoneticConfig.isOpen} onChange={onChangePhoneticIsOpen} className="switch-root">
                      <span aria-hidden="true" className="switch-thumb" />
                    </Switch>
                    <span className="text-right text-xs font-normal leading-tight text-gray-400">{`音标已${
                      phoneticConfig.isOpen ? '开启' : '关闭'
                    }`}</span>
                  </div>
                </div>
                <div className="flex w-full  flex-col  items-start gap-2 py-0">
                  <span className="text-sm font-normal leading-5 text-white text-opacity-60">开关单词发音</span>
                  <div className="flex w-full flex-row items-center justify-between">
                    <Switch checked={pronunciationConfig.isOpen} onChange={onChangePronunciationIsOpen} className="switch-root">
                      <span aria-hidden="true" className="switch-thumb" />
                    </Switch>
                    <span className="text-right text-xs font-normal leading-tight text-gray-400">{`发音已${
                      pronunciationConfig.isOpen ? '开启' : '关闭'
                    }`}</span>
                  </div>
                </div>
                {window.speechSynthesis && (
                  <div className="flex w-full  flex-col  items-start gap-2 py-0">
                    <span className="text-sm font-normal leading-5 text-white text-opacity-60">开关释义发音</span>
                    <div className="flex w-full flex-row items-center justify-between">
                      <Switch checked={pronunciationConfig.isTransRead} onChange={onChangePronunciationIsTransRead} className="switch-root">
                        <span aria-hidden="true" className="switch-thumb" />
                      </Switch>
                      <span className="text-right text-xs font-normal leading-tight text-gray-400">{`发音已${
                        pronunciationConfig.isTransRead ? '开启' : '关闭'
                      }`}</span>
                    </div>
                  </div>
                )}
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

export default PronunciationSwitcher
