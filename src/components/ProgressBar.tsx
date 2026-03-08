import { useEffect, useState } from 'react'

export type ProgressBarProps = {
  progress: number
  className?: string
  barClassName?: string
  showPercentage?: boolean
  colorPhases?: Array<{ threshold: number; className: string }>
}

const DEFAULT_COLOR_PHASES = [
  { threshold: 0, className: 'bg-indigo-200 dark:bg-indigo-300' },
  { threshold: 33.4, className: 'bg-indigo-300 dark:bg-indigo-400' },
  { threshold: 66.8, className: 'bg-indigo-400 dark:bg-indigo-500' },
]

export function ProgressBar({
  progress,
  className = '',
  barClassName = '',
  showPercentage = false,
  colorPhases = DEFAULT_COLOR_PHASES,
}: ProgressBarProps) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const colorPhase = colorPhases.findIndex((p, i) => {
      const nextPhase = colorPhases[i + 1]
      return progress >= p.threshold && (!nextPhase || progress < nextPhase.threshold)
    })
    setPhase(colorPhase >= 0 ? colorPhase : 0)
  }, [progress, colorPhases])

  const currentColorClass = colorPhases[phase]?.className ?? colorPhases[0]?.className ?? ''

  return (
    <div className={`relative pt-1 ${className}`}>
      <div className={`mb-4 flex h-2 overflow-hidden rounded-xl bg-indigo-100 text-xs transition-all duration-300 dark:bg-indigo-200 ${barClassName}`}>
        <div
          style={{ width: `${progress}%` }}
          className={`flex flex-col justify-center whitespace-nowrap rounded-xl text-center text-white shadow-none transition-all duration-300 ${currentColorClass}`}
        >
          {showPercentage && <span className="text-xs">{Math.round(progress)}%</span>}
        </div>
      </div>
    </div>
  )
}

export type ProgressIndicatorProps = {
  current: number
  total: number
  className?: string
}

export function ProgressIndicator({ current, total, className = '' }: ProgressIndicatorProps) {
  const progress = total > 0 ? (current / total) * 100 : 0

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ProgressBar progress={progress} className="flex-1" />
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {current}/{total}
      </span>
    </div>
  )
}
