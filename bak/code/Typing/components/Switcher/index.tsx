import AnalysisButton from '../AnalysisButton'
import Setting from '../Setting'
import WordDictationSwitcher from '../WordDictationSwitcher'
import Tooltip from '@/components/Tooltip'
import { useAtomValue, useSetAtom } from 'jotai'
import { useHotkeys } from 'react-hotkeys-hook'
import { isTransVisibleAtom, toggleTransVisibleAtom } from '../../store'
import IconLanguage from '~icons/tabler/language'
import IconLanguageOff from '~icons/tabler/language-off'

export default function Switcher() {
  const isTransVisible = useAtomValue(isTransVisibleAtom)
  const toggleTransVisible = useSetAtom(toggleTransVisibleAtom)

  const changeTransVisibleState = () => {
    toggleTransVisible()
  }

  useHotkeys(
    'ctrl+shift+v',
    () => {
      changeTransVisibleState()
    },
    { enableOnFormTags: true, preventDefault: true },
    [],
  )

  return (
    <div className="flex items-center justify-center gap-2">
      <Tooltip className="h-7 w-7" content="开关默写模式（Ctrl + V）">
        <WordDictationSwitcher />
      </Tooltip>
      <Tooltip className="h-7 w-7" content="开关释义显示（Ctrl + Shift + V）">
        <button
          className={`p-[2px] ${isTransVisible ? 'text-indigo-500' : 'text-gray-500'} text-lg focus:outline-none`}
          type="button"
          onClick={(e) => {
            changeTransVisibleState()
            e.currentTarget.blur()
          }}
          aria-label="开关释义显示（Ctrl + T）"
        >
          {isTransVisible ? <IconLanguage /> : <IconLanguageOff />}
        </button>
      </Tooltip>

      <Tooltip className="h-7 w-7" content="查看数据统计">
        <AnalysisButton />
      </Tooltip>

      <Tooltip content="设置">
        <Setting />
      </Tooltip>
    </div>
  )
}
