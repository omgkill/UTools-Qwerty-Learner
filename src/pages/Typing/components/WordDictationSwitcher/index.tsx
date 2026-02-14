import { wordDictationConfigAtom } from '@/store'
import { useAtom } from 'jotai'
import { useHotkeys } from 'react-hotkeys-hook'
import IconEyeSlash from '~icons/heroicons/eye-slash-solid'
import IconEye from '~icons/heroicons/eye-solid'

export default function WordDictationSwitcher() {
  const [wordDictationConfig, setWordDictationConfig] = useAtom(wordDictationConfigAtom)

  const onToggleWordDictation = () => {
    setWordDictationConfig((old) => ({
      ...old,
      isOpen: !old.isOpen,
    }))
  }

  useHotkeys(
    'ctrl+v',
    () => {
      onToggleWordDictation()
    },
    { enableOnFormTags: true, preventDefault: true },
    [],
  )

  return (
    <button
      className={`flex items-center justify-center rounded p-[2px] text-lg ${
        wordDictationConfig.isOpen ? 'text-indigo-500' : 'text-gray-500'
      } outline-none transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white`}
      type="button"
      onClick={onToggleWordDictation}
      aria-label="开关默写模式"
    >
      {wordDictationConfig.isOpen ? <IconEye className="icon" /> : <IconEyeSlash className="icon" />}
    </button>
  )
}
