import InfoBox from './InfoBox'
import { useAtomValue } from 'jotai'
import { correctCountAtom, timerDataAtom, wrongCountAtom } from '../../store'

export default function Speed() {
  const timerData = useAtomValue(timerDataAtom)
  const correctCount = useAtomValue(correctCountAtom)
  const wrongCount = useAtomValue(wrongCountAtom)

  const seconds = timerData.time % 60
  const minutes = Math.floor(timerData.time / 60)
  const secondsString = seconds < 10 ? '0' + seconds : seconds + ''
  const minutesString = minutes < 10 ? '0' + minutes : minutes + ''
  const inputNumber = correctCount + wrongCount

  return (
    <div className="card flex w-3/5 rounded-xl bg-white p-4 py-10 opacity-50 transition-colors duration-300 dark:bg-gray-800">
      <InfoBox info={`${minutesString}:${secondsString}`} description="时间" />
      <InfoBox info={inputNumber + ''} description="输入数" />
      <InfoBox info={timerData.wpm + ''} description="WPM" />
      <InfoBox info={correctCount + ''} description="正确数" />
      <InfoBox info={timerData.accuracy + ''} description="正确率" />
    </div>
  )
}
