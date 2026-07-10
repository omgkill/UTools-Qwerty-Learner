import { VIP_STATE_KEY, setUtoolsValue } from '@/platform/utools'

export { VIP_STATE_KEY, getUtoolsValue, setConcealFeature, setUtoolsValue } from '@/platform/utools'

export const processPayment = () => {
  setUtoolsValue(VIP_STATE_KEY, 'c')
}
