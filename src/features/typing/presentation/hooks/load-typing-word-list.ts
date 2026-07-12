import { loadWordList as loadWordListUseCase } from '@/features/word-bank/application'
import { appLocalWordBankRepository } from '@/infra/repositories/local-word-bank.repository'
import type { WordBank, WordWithIndex } from '@/typings'

export async function loadTypingWordList(currentWordBank: WordBank): Promise<WordWithIndex[] | null> {
  return loadWordListUseCase(appLocalWordBankRepository, currentWordBank)
}
