import { useSetAtom } from 'jotai'
import { useHotkeys } from 'react-hotkeys-hook'
import { toast } from 'react-toastify'
import { toggleImmersiveModeAtom } from '../store'

export function useTypingHotkeys(isImmersiveMode: boolean) {
  const toggleImmersiveMode = useSetAtom(toggleImmersiveModeAtom)

  useHotkeys(
    'alt+i',
    () => {
      toggleImmersiveMode()
      if (!isImmersiveMode) {
        toast('再次按下 Alt + I 可退出沉浸模式🤞', {
          position: 'top-center',
          autoClose: 2000,
          hideProgressBar: true,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: false,
          progress: undefined,
          theme: 'light',
        })
      }
    },
    { preventDefault: true },
  )
}
