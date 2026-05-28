export type LetterState = 'pending' | 'correct' | 'wrong'

interface LetterProps {
  letter: string
  state: LetterState
}

export function Letter({ letter, state }: LetterProps) {
  const getColorClass = () => {
    switch (state) {
      case 'correct':
        return 'text-green-500'
      case 'wrong':
        return 'text-red-500'
      default:
        return 'text-gray-800'
    }
  }

  return (
    <span
      className={`font-mono text-4xl mx-1 ${getColorClass()}`}
      data-testid={`letter-${state}`}
    >
      {letter}
    </span>
  )
}