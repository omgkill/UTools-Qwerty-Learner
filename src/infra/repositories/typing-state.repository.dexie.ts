import type { TypingStateRepository } from '@/features/typing/application/ports'
import type { TypingStateSessionType, TypingStateSnapshot } from '@/features/typing/domain'
import { db as defaultDb } from '@/utils/db'
import type { ITypingState } from '@/utils/db/typingState'
import type Dexie from 'dexie'
import type { Table } from 'dexie'

type TypingStateTables = {
  typingStates: Table<ITypingState, number>
}

export class DexieTypingStateRepository implements TypingStateRepository {
  constructor(private db: Dexie) {}

  private get typingStates(): Table<ITypingState, number> {
    return (this.db as Dexie & TypingStateTables).typingStates
  }

  async getStates(dictId: string, date: string, sessionType?: TypingStateSessionType): Promise<TypingStateSnapshot[]> {
    const states = await this.typingStates.where('[dict+date]').equals([dictId, date]).toArray()
    if (!sessionType) {
      return states
    }
    return states.filter((state) => (state.sessionType ?? 'repeat') === sessionType)
  }

  async deleteStates(ids: number[]): Promise<void> {
    if (ids.length === 0) return
    await this.typingStates.bulkDelete(ids)
  }

  saveState(state: TypingStateSnapshot): Promise<number> {
    return this.typingStates.put(state)
  }
}

export const dexieTypingStateRepository = new DexieTypingStateRepository(defaultDb)
