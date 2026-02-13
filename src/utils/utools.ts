export const setConcealFeature = () => {
  let features = utools.getFeatures()
  utools.setFeature({
    code: 'conceal',
    explain: '🐟背单词打字摸鱼模式，摸鱼一时爽,一直摸鱼一直爽~~',
    cmds: ['moyu', 'moyv', 'typing-摸鱼模式'],
  })
  features = utools.getFeatures()
}

export const processPayment = (ret) => {
  localStorage.setItem('x-vipState', 'c')
}
