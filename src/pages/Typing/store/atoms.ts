import type { DailyRecord } from '@/utils/storage'
import { atom } from 'jotai'

export const dailyRecordAtom = atom<DailyRecord | null>(null)
