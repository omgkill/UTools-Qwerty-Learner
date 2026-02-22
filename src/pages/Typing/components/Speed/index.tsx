import { TypingContext, initialState } from '../../store'
import InfoBox from './InfoBox'
import { useContext } from 'react'

export default function Speed() {
  const typingContext = useContext(TypingContext)
  const state = typingContext?.state ?? initialState
  const seconds = state.statsData.timerData.time % 60
  const minutes = Math.floor(state.statsData.timerData.time / 60)
  const secondsString = seconds < 10 ? '0' + seconds : seconds + ''
  const minutesString = minutes < 10 ? '0' + minutes : minutes + ''
  const inputNumber = state.statsData.correctCount + state.statsData.wrongCount

  return (
    <div className="card flex w-3/5 rounded-xl bg-white p-4 py-10 opacity-50 transition-colors duration-300 dark:bg-gray-800">
      <InfoBox info={`${minutesString}:${secondsString}`} description="时间" />
      <InfoBox info={inputNumber + ''} description="输入数" />
      <InfoBox info={state.statsData.timerData.wpm + ''} description="WPM" />
      <InfoBox info={state.statsData.correctCount + ''} description="正确数" />
      <InfoBox info={state.statsData.timerData.accuracy + ''} description="正确率" />
    </div>
  )
}
