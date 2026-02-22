import { GalleryContext } from '../'
import FileDropZone from '../FileDropZone'
import { languageType } from '../constants'
import type { ParsedWordList } from './parseWordList.ts'
import { parseWordList, parseWordListFile } from './parseWordList.ts'
import LoadingIndicator from '@/components/LoadingIndicator'
import Tooltip from '@/components/Tooltip'
import { Dialog, Transition } from '@headlessui/react'
import mixpanel from 'mixpanel-browser'
import { Fragment, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import IconX from '~icons/tabler/x'
import IconAdd from '~icons/uil/plus'

interface Props {
  onSaveDictSuccess: () => void
}

const Form4AddDict: React.FC<Props> = ({ onSaveDictSuccess }) => {
  const [formData, setFormData] = useState({ name: '', language: 'en' })
  const [fileInfo, setFileInfo] = useState({ name: '', type: '', msg: '' })
  const [wordCount, setWordCount] = useState(0)
  const [alertMessage, setAlertMessage] = useState({ loadDictMsg: '', resolveDictMsg: '' })
  const [importMode, setImportMode] = useState<'file' | 'text'>('text')
  const [textValue, setTextValue] = useState('')
  const [summary, setSummary] = useState({ rawCount: 0, duplicateCount: 0, skippedNoExplain: 0, validCount: 0 })
  const [skippedWords, setSkippedWords] = useState<string[]>([])
  const [importResult, setImportResult] = useState('')

  const [isOpen, setIsOpen] = useState(false)

  const { state } = useContext(GalleryContext)!

  const closeModal = () => {
    setIsOpen(false)
  }
  const openModal = async () => {
    setFormData({ name: '', language: 'en' })
    setFileInfo({ name: '', type: '', msg: '' })
    setWordCount(0)
    setAlertMessage({ loadDictMsg: '', resolveDictMsg: '' })
    setImportMode('text')
    setTextValue('')
    setSummary({ rawCount: 0, duplicateCount: 0, skippedNoExplain: 0, validCount: 0 })
    setSkippedWords([])
    setImportResult('')

    const config = window.readLocalWordBankConfig()
    const limitCount = (() => {
      if (state.vipState === 'b') return 4
      if (state.vipState === 'c') return 20
      return 0
    })()
    if (config.length >= limitCount) {
      toast.info(`😣我撑不住了，词库太多了！(最大添加${limitCount}本自定义词库)`)
      return
    }
    setIsOpen(true)
  }
  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    })
  }

  const handleSwitchImportMode = (mode: 'file' | 'text') => {
    setImportMode(mode)
    setFileInfo({ name: '', type: '', msg: '' })
    setWordCount(0)
    setAlertMessage({ loadDictMsg: '', resolveDictMsg: '' })
    setSummary({ rawCount: 0, duplicateCount: 0, skippedNoExplain: 0, validCount: 0 })
    setSkippedWords([])
    setImportResult('')
    window._pendingWordList = null
  }

  const resolveWordList = async (parsed: ParsedWordList) => {
    if (parsed.words.length === 0) {
      setAlertMessage({ loadDictMsg: '', resolveDictMsg: '未找到有效单词' })
      setWordCount(0)
      setSummary({ rawCount: parsed.rawCount, duplicateCount: parsed.rawCount, skippedNoExplain: 0, validCount: 0 })
      setSkippedWords([])
      window._pendingWordList = null
      return
    }

    const dicts = window.getMdxDictConfig?.() || window.services?.getDictList?.() || []
    if (!dicts[0] || !window.queryFirstMdxWord) {
      setAlertMessage({ loadDictMsg: '', resolveDictMsg: '未检测到词典，无法校验释义' })
      setWordCount(0)
      setSummary({ rawCount: parsed.rawCount, duplicateCount: parsed.rawCount - parsed.words.length, skippedNoExplain: 0, validCount: 0 })
      setSkippedWords([])
      window._pendingWordList = null
      return
    }

    setAlertMessage({ loadDictMsg: '校验释义中', resolveDictMsg: '' })

    let skippedNoExplain = 0
    const skippedNoExplainWords: string[] = []
    const validWords = []
    for (const word of parsed.words) {
      try {
        const result = await window.queryFirstMdxWord(word.name)
        if (result && result.ok && result.content) {
          validWords.push(word)
        } else {
          skippedNoExplain += 1
          skippedNoExplainWords.push(word.name)
        }
      } catch {
        skippedNoExplain += 1
        skippedNoExplainWords.push(word.name)
      }
    }

    const duplicateCount = parsed.rawCount - parsed.words.length
    const validCount = validWords.length
    setSummary({ rawCount: parsed.rawCount, duplicateCount, skippedNoExplain, validCount })
    setWordCount(validCount)
    setSkippedWords(skippedNoExplainWords)
    window._pendingWordList = validCount > 0 ? validWords : null

    if (validCount === 0) {
      setAlertMessage({ loadDictMsg: '', resolveDictMsg: '没有可导入的单词' })
      return
    }
    setAlertMessage({ loadDictMsg: `解析完毕，有效 ${validCount} 个单词`, resolveDictMsg: '' })
  }

  const handleFilesSelected = async (files) => {
    const file = files[0]
    if (!file) return

    const isTextFile =
      file.type.startsWith('text/') ||
      file.type === '' ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.csv')

    if (!isTextFile) {
      setFileInfo({ name: file.name, type: file.type, msg: '不支持的文件类型，请上传文本文件 ❌' })
      return
    }

    const limitSize = 2
    let msg = '文件类型正确 ✔'
    if (file.size / 1024 ** 2 > limitSize) {
      msg += ` 文件大小超过${limitSize}M ❌`
      setFileInfo({ name: file.name, type: file.type, msg })
      return
    }
    msg += ` 文件大小未超过${limitSize}M ✔`

    setFileInfo({ name: file.name, type: file.type || 'text/plain', msg })
    setAlertMessage({ ...alertMessage, loadDictMsg: '解析中' })

    try {
      const parsed = await parseWordListFile(file)
      await resolveWordList(parsed)
    } catch (error) {
      setAlertMessage({ loadDictMsg: '', resolveDictMsg: '解析失败：' + error.message })
    }
  }

  const handleResolveText = async () => {
    setAlertMessage({ loadDictMsg: '解析中', resolveDictMsg: '' })
    const parsed = parseWordList(textValue)
    await resolveWordList(parsed)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (formData.name.trim().length <= 0) {
      toast.info('词库名称不能为空')
      return false
    }
    if (formData.name.trim().length >= 10) {
      toast.info('词库名称过长(应少于10个字)')
      return false
    }
    if (!window._pendingWordList || window._pendingWordList.length === 0) {
      toast.info('未导入词库文件或文件无有效单词')
      return false
    }

    if (alertMessage.resolveDictMsg) {
      toast.error('词库解析异常')
      return false
    }

    const config = window.readLocalWordBankConfig()
    const isNameExists = config.some((wb) => wb.name.trim() === formData.name.trim())
    if (isNameExists) {
      toast.error('词库名称已存在，请使用其他名称')
      return false
    }

    saveWordBank(formData, window._pendingWordList)
    window._pendingWordList = null
    const summaryText =
      summary.validCount > 0
        ? `导入 ${summary.validCount} 个，去重 ${summary.duplicateCount} 个，跳过无释义 ${summary.skippedNoExplain} 个`
        : '未导入有效单词'
    setImportResult(`导入成功：${formData.name}，${summaryText}`)
    toast.success(`自定义词库添加成功，${summaryText}`)
    mixpanel.track('Import WordBank')

    onSaveDictSuccess()
    setIsOpen(false)
  }

  return (
    <div>
      <>
        {['b', 'c'].includes(state.vipState) && (
          <Tooltip content="添加词库" placement="top" className="!absolute right-[6.5rem] top-24">
            <button
              type="button"
              onClick={openModal}
              className="fixed right-20 top-24 z-10 rounded-lg bg-indigo-50 px-2 py-2 text-lg hover:bg-indigo-200 focus:outline-none bg-opacity-50 hover:bg-opacity-100"
            >
              <IconAdd className="h-6 w-6 text-lg text-indigo-500 text-white" />
            </button>
          </Tooltip>
        )}
      </>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-200 transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  <button type="button" onClick={closeModal} title="关闭对话框">
                    <IconX className="absolute right-7 top-5 cursor-pointer text-gray-400" />
                  </button>
                  <Dialog.Title as="h2" className="mb-8 text-center text-xl font-medium leading-6 text-gray-200">
                    新增词库
                  </Dialog.Title>
                  <form onSubmit={handleSubmit} className="p-2">
                    <div className="mb-8 grid grid-cols-[1fr_5fr]">
                      <label htmlFor="name" className="mb-4 block font-bold text-gray-200">
                        词库名称:
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-400 bg-gray-700 p-2 text-white"
                      />
                    </div>
                    <div className="mb-8 grid grid-cols-[1fr_5fr]">
                      <label className="mb-4 block font-bold text-gray-200">类型:</label>
                      <select
                        name="language"
                        value={formData.language}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-400 bg-gray-700 p-2 text-white"
                      >
                        {languageType.map((item) => (
                          <option value={item.type} key={item.type}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-6 flex items-center gap-3">
                      <span className="font-bold text-gray-200">导入方式:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className={`rounded-lg px-3 py-1 text-sm font-bold ${
                            importMode === 'file' ? 'bg-indigo-400 text-white' : 'bg-gray-700 text-gray-200'
                          }`}
                          onClick={() => handleSwitchImportMode('file')}
                        >
                          文件
                        </button>
                        <button
                          type="button"
                          className={`rounded-lg px-3 py-1 text-sm font-bold ${
                            importMode === 'text' ? 'bg-indigo-400 text-white' : 'bg-gray-700 text-gray-200'
                          }`}
                          onClick={() => handleSwitchImportMode('text')}
                        >
                          文本
                        </button>
                      </div>
                    </div>

                    {importMode === 'file' ? (
                      <div className="mb-4">
                        <FileDropZone onFilesSelected={handleFilesSelected}>
                          {fileInfo.name.trim() ? (
                            <div className="flex flex-col items-start justify-center py-4 text-gray-200">
                              <p className="pb-2">
                                <span className="font-mono text-lg font-bold">文件: </span>
                                {fileInfo.name}
                              </p>
                              <p className="pb-2">
                                <span className="font-mono text-lg font-bold">提示: </span>
                                {fileInfo.msg}
                              </p>
                              {wordCount > 0 && (
                                <p className="pb-2 text-green-400">
                                  <span className="font-mono text-lg font-bold">单词数: </span>
                                  {wordCount}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-gray-200">
                              <IconAdd className="h-16 w-16 p-2 text-lg text-gray-200" />
                              <p className="text-2lg py-4 font-bold">
                                拖拽或点击上传<span className="text-red-400">文本文件</span>
                              </p>
                              <p className="text-sm text-gray-400">
                                支持 txt、csv 等文本格式，单词以空格、Tab、逗号、分号、换行分隔
                              </p>
                            </div>
                          )}
                          {alertMessage.loadDictMsg === '解析中' || alertMessage.loadDictMsg === '校验释义中' ? (
                            <LoadingIndicator text={alertMessage.loadDictMsg} />
                          ) : (
                            alertMessage.loadDictMsg && (
                              <p className="text-green-400">{alertMessage.loadDictMsg}</p>
                            )
                          )}
                        </FileDropZone>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <textarea
                          value={textValue}
                          onChange={(event) => setTextValue(event.target.value)}
                          rows={6}
                          className="w-full rounded-lg border border-gray-400 bg-gray-700 p-3 text-white"
                          placeholder="单词以空格、Tab、逗号、分号、换行分隔"
                        />
                        <div className="mt-3 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={handleResolveText}
                            className="rounded-lg bg-indigo-400 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500"
                          >
                            解析文本
                          </button>
                          {wordCount > 0 && <span className="text-sm text-green-400">单词数：{wordCount}</span>}
                        </div>
                        {alertMessage.loadDictMsg === '解析中' || alertMessage.loadDictMsg === '校验释义中' ? (
                          <div className="mt-3">
                            <LoadingIndicator text={alertMessage.loadDictMsg} />
                          </div>
                        ) : (
                          alertMessage.loadDictMsg && (
                            <p className="mt-3 text-green-400">{alertMessage.loadDictMsg}</p>
                          )
                        )}
                      </div>
                    )}

                    {summary.rawCount > 0 && (
                      <p className="mb-4 text-sm text-gray-400">{`原始 ${summary.rawCount} 个，去重 ${summary.duplicateCount} 个，跳过无释义 ${summary.skippedNoExplain} 个，导入 ${summary.validCount} 个`}</p>
                    )}
                    {importResult && <p className="mb-4 text-sm text-green-400">{importResult}</p>}
                    {skippedWords.length > 0 && (
                      <div className="mb-4">
                        <div className="mb-2 text-sm font-bold text-gray-200">跳过单词（无释义）</div>
                        <div className="max-h-24 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-2 text-xs text-gray-300">
                          <div className="flex flex-wrap gap-2">
                            {skippedWords.map((word) => (
                              <span key={word} className="rounded bg-gray-700 px-2 py-1 text-gray-200">
                                {word}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-8 flex justify-between">
                      <div className="mx-2 my-4 text-lg text-red-400 ">{alertMessage.resolveDictMsg}</div>
                      <button
                        className="text-bold h-15 w-1/4 rounded-lg bg-indigo-400 font-bold text-white hover:bg-indigo-500 text-gray-200"
                        type="submit"
                      >
                        确定
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}

Form4AddDict.propTypes = {
  onSaveDictSuccess: (props: Record<string, unknown>, propName: string, componentName: string) => {
    if (typeof props[propName] !== 'function') {
      return new Error(`${componentName}: ${propName} must be a function`)
    }
    return null
  },
}

export default Form4AddDict

const saveWordBank = (formData, wordList) => {
  const createWordBankMeta = (formData) => {
    const { name, language } = formData
    const uuid = crypto.randomUUID()
    return {
      id: 'x-dict-' + uuid,
      name: name.trim(),
      url: `/dicts/${uuid}.json`,
      language,
      description: '自定义词库',
      category: '自定义',
      tags: ['Default'],
      length: wordList.length,
      chapterCount: Math.ceil(wordList.length / 20),
      languageCategory: 'custom',
    }
  }

  const wordBankMeta = createWordBankMeta(formData)
  window.newLocalWordBankFromJson(wordList, wordBankMeta)
}
