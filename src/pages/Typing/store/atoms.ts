import type { IDailyRecord } from '@/utils/db/progress'
import { atom } from 'jotai'

export const dailyRecordAtom = atom<IDailyRecord | null>(null)
