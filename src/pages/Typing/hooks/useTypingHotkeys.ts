import { TypingContext, TypingStateActionType } from '../store'
import { useContext } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import mixpanel from 'mixpanel-browser'
import { toast } from 'react-toastify'

export function useTypingHotkeys(
  isImmersiveMode: boolean,
) {
  const typingContext = useContext(TypingContext)
  const dispatch = typingContext?.dispatch

  useHotkeys(
    'alt+i',
    () => {
      if (!dispatch) return
      dispatch({ type: TypingStateActionType.TOGGLE_IMMERSIVE_MODE })
      mixpanel.track('ImmersiveMode', { state: isImmersiveMode ? 'close' : 'open' })
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
