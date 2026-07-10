export const VIP_STATE_KEY = 'x-vipState'

export const setConcealFeature = () => {
  if (typeof window === 'undefined') return
  if (!window.utools) return

  window.utools.setFeature({
    code: 'conceal',
    explain: '🐟背单词打字摸鱼模式，摸鱼一时爽,一直摸鱼一直爽~~',
    cmds: ['moyu', 'moyv', 'typing-摸鱼模式'],
  })
}
