import type { AnalysisRepository } from '@/features/analysis/application/ports'
import { db } from '@/utils/db'

export const dexieAnalysisRepository: AnalysisRepository = {
  getDailyRecordsByDict(dictId) {
    return db.dailyRecords.where('dict').equals(dictId).toArray()
  },

  getWordProgressByDict(dictId) {
    return db.wordProgress.where('dict').equals(dictId).toArray()
  },
}
