import { useEffect, useState } from 'react'

interface LoadingIndicatorProps {
  text?: string
}

export default function LoadingIndicator({ text = '载入中...' }: LoadingIndicatorProps) {
  const [status, setStatus] = useState('')

  useEffect(() => {
    const intervalId = setInterval(() => {
      setStatus((prevStatus) => {
        const dots = prevStatus.match(/\./g) ?? []
        const dotCount = dots.length
        const newStatus = dotCount < 6 ? prevStatus + '.' : ''
        return newStatus
      })
    }, 300)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  return <div>{text + status}</div>
}
