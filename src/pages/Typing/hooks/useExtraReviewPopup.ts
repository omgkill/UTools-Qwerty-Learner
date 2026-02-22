import { useCallback, useEffect, useState } from 'react'

export function useExtraReviewPopup(
  hasReachedTarget: boolean,
  hasMoreDueWords: boolean,
  isExtraReview: boolean,
  startExtraReview: () => void,
) {
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    if (hasReachedTarget && hasMoreDueWords && !isExtraReview && !showPopup) {
      setShowPopup(true)
    }
  }, [hasReachedTarget, hasMoreDueWords, isExtraReview, showPopup])

  const handleConfirm = useCallback(() => {
    setShowPopup(false)
    startExtraReview()
  }, [startExtraReview])

  const handleDismiss = useCallback(() => {
    setShowPopup(false)
  }, [])

  return {
    showPopup,
    handleConfirm,
    handleDismiss,
  }
}
