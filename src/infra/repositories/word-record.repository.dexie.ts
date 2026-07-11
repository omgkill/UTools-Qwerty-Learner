import { recordDataWrite } from '@/features/backup/application'
import type { WordRecordRepository } from '@/features/typing/application/ports'
import type { LetterMistakes, TypingWordRecord } from '@/features/typing/domain'
import { db as defaultDb } from '@/utils/db'
import { WordRecord } from '@/utils/db/record'
import type { IWordRecord } from '@/utils/db/record'
import type Dexie from 'dexie'
import type { Table } from 'dexie'

type WordRecordTables = {
  wordRecords: Table<IWordRecord, number>
}

export class DexieWordRecordRepository implements WordRecordRepository {
  constructor(private db: Dexie) {}

  private get wordRecords(): Table<IWordRecord, number> {
    return (this.db as Dexie & WordRecordTables).wordRecords
  }

  async addWordRecord(params: {
    word: string
    dictId: string
    timing: number[]
    wrongCount: number
    mistakes: LetterMistakes
  }): Promise<number> {
    const wordRecord = new WordRecord(params.word, params.dictId, params.timing, params.wrongCount, params.mistakes)

    const id = await this.wordRecords.add(wordRecord)
    recordDataWrite()
    return id
  }

  async listWordRecordsInRange(dictId: string, start: number, end: number): Promise<Pick<TypingWordRecord, 'word'>[]> {
    return this.wordRecords.where('[dict+timeStamp]').between([dictId, start], [dictId, end]).toArray()
  }
}

export const dexieWordRecordRepository = new DexieWordRecordRepository(defaultDb)
