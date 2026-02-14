import { GalleryContext } from '../'
import FileDropZone from '../FileDropZone'
import { languageType } from '../constants'
import { parseWordListFile } from './parseWordList.ts'
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
      const words = await parseWordListFile(file)
      if (words.length === 0) {
        setAlertMessage({ loadDictMsg: '', resolveDictMsg: '未找到有效单词' })
        return
      }
      setWordCount(words.length)
      setAlertMessage({ loadDictMsg: `解析完毕，共 ${words.length} 个单词`, resolveDictMsg: '' })
      window._pendingWordList = words
    } catch (error) {
      setAlertMessage({ loadDictMsg: '', resolveDictMsg: '解析失败：' + error.message })
    }
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
    toast.success('自定义词库添加成功')
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
                        {alertMessage.loadDictMsg === '解析中' ? (
                          <LoadingIndicator text={alertMessage.loadDictMsg} />
                        ) : (
                          alertMessage.loadDictMsg && (
                            <p className="text-green-400">{alertMessage.loadDictMsg}</p>
                          )
                        )}
                      </FileDropZone>
                    </div>

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
