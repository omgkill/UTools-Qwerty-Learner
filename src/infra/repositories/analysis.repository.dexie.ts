import type { AnalysisRepository } from '@/features/analysis/application/ports'
import { db } from '@/utils/db'

export const dexieAnalysisRepository: AnalysisRepository = {
  getAllWordRecords() {
    return db.wordRecords.toArray()
  },

  getDailyRecordsByDict(dictId) {
    return db.dailyRecords.where('dict').equals(dictId).toArray()
  },

  getWordRecordsByDict(dictId) {
    return db.wordRecords.where('dict').equals(dictId).toArray()
  },

  getWordProgressByDict(dictId) {
    return db.wordProgress.where('dict').equals(dictId).toArray()
  },
}
