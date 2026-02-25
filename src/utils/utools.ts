export const setConcealFeature = () => {
  if (window.utools) {
    window.utools.setFeature({
    code: 'conceal',
    explain: '🐟背单词打字摸鱼模式，摸鱼一时爽,一直摸鱼一直爽~~',
    cmds: ['moyu', 'moyv', 'typing-摸鱼模式'],
    })
  }
}

export const processPayment = () => {
  localStorage.setItem('x-vipState', 'c')
}
