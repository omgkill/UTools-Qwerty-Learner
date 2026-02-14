import { GalleryContext } from '../'
import FileDropZone from '../FileDropZone'
import { languageType } from '../constants'
import DictionaryDownload from './DictionaryDownload.jsx'
import { convertExcelToJson } from './convertExcelToJson.ts'
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
  const [fileInfo, setFileInfo] = useState({ name: '', type: '' })
  const [fileContent, setFileContent] = useState({ content: '' })
  const [alertMessage, setAlertMessage] = useState({ loadDictMsg: '', resolveDictMsg: '' })

  const [isOpen, setIsOpen] = useState(false)

  const { state } = useContext(GalleryContext)!

  const closeModal = () => {
    setIsOpen(false)
  }
  const openModal = async () => {
    setFormData({ name: '', language: 'en' })
    setFileInfo({ name: '', type: '', msg: '' })
    setFileContent({ content: '' })
    setAlertMessage({ loadDictMsg: '', resolveDictMsg: '' })

    const config = window.readLocalDictConfig()
    const limitCount = (() => {
      if (state.vipState === 'b') return 4
      if (state.vipState === 'c') return 20
      return 0
    })()
    if (config.length >= limitCount) {
      toast.info(`😣我撑不住了，词典太多了！(最大添加${limitCount}本自定义词典)`)
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
    setFileContent({ content: '' })
    const content = files[0]

    let msg = ''

    let isSupportFileType = true
    let isLessThan2M = false
    let isExcel = false

    if (content.type === 'application/json') {
      msg = '文件类型正确 ✔'
    } else if (
      content.type === 'application/vnd.ms-excel' ||
      content.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      msg = '文件类型正确 ✔'
      isExcel = true
    } else {
      msg = '不支持的文件类型(仅支持xls、xlsx) ❌'
      isSupportFileType = false
    }

    const limitSize = 2
    if (content.size / 1024 ** 2 <= limitSize) {
      msg = msg + ` 文件大小未超过${limitSize}M ✔`
      isLessThan2M = true
    } else {
      msg = msg + ` 文件大小超过${limitSize}M ❌`
    }

    if (!isSupportFileType) {
      msg = msg + '  请重新选择 ❗'
    }

    setFileInfo({ name: content.name, type: content.type, msg })
    const _resolve = (jsonData) => {
      if (jsonData.length <= 0) {
        setAlertMessage({ ...alertMessage, resolveDictMsg: '词典词条数为0' })
        return
      }
      const isValid = jsonData.every((item) => {
        const valid4name = 'string' === typeof item.name && item.name.trim()
        const valid4trans = Array.isArray(item.trans) && 'string' === typeof item.trans[0]
        return valid4name && valid4trans
      })
      if (!isValid) {
        setAlertMessage({ ...alertMessage, resolveDictMsg: '存在无效行' })
        return
      }

      setAlertMessage({ resolveDictMsg: '', loadDictMsg: '解析完毕' })
      setFileContent({ ...fileContent, content: jsonData })
    }
    const _reject = (error) => {
      setAlertMessage({ ...alertMessage, loadDictMsg: '解析出错：' + error.message })
    }
    if (isSupportFileType && isLessThan2M) {
      setAlertMessage({ ...alertMessage, loadDictMsg: '解析中' })
      if (isExcel) {
        convertExcelToJson(content).then(_resolve).catch(_reject)
      } else {
        readJsonFile(content).then(_resolve).catch(_reject)
      }
    } else {
      toast.error('不支持导入该文件')
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (formData.name.trim().length <= 0) {
      toast.info('词典名称不能为空')
      return false
    }
    if (formData.name.trim().length >= 10) {
      toast.info('词典名称过长(应少于10个字)')
      return false
    }
    if (!fileContent.content) {
      toast.info('未导入词典文件')
      return false
    }

    if (alertMessage.resolveDictMsg) {
      console.log(alertMessage.resolveDictMsg)
      toast.error('词典解析异常')
      return false
    }

    const config = window.readLocalDictConfig()
    const isNameExists = config.some((dict) => dict.name.trim() === formData.name.trim())
    if (isNameExists) {
      toast.error('词典名称已存在，请使用其他名称')
      return false
    }

    saveDict(formData, fileContent.content)
    toast.success('自定义词典添加成功')
    mixpanel.track('Import Dict')

    onSaveDictSuccess()
    setIsOpen(false)
  }

  return (
    <div>
      <>
        {['b', 'c'].includes(state.vipState) && (
          <Tooltip content="添加词典" placement="top" className="!absolute right-[6.5rem] top-24">
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
                    新增词典
                  </Dialog.Title>
                  <form onSubmit={handleSubmit} className="p-2">
                    <div className="mb-8 grid grid-cols-[1fr_5fr]">
                      <label htmlFor="name" className="mb-4 block font-bold text-gray-200">
                        词典名称:
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
                              <span className="font-mono text-lg font-bold">File: </span>
                              {fileInfo.name}
                            </p>
                            <p className="pb-2">
                              <span className="font-mono text-lg font-bold">Type: </span>
                              {fileInfo.type}
                            </p>
                            <p className="pb-2">
                              <span className="font-mono text-lg font-bold">Tips: </span>
                              {fileInfo.msg}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-200">
                            <IconAdd className="h-16 w-16 p-2 text-lg text-gray-200" />
                            <p className="text-2lg py-4 font-bold">
                              拖拽 词典文件<span className="text-red-400">(支持xls、xlsx格式)</span> 到此处
                            </p>
                          </div>
                        )}
                        {alertMessage.loadDictMsg === '解析中' ? (
                          <LoadingIndicator text={alertMessage.loadDictMsg} />
                        ) : (
                          alertMessage.loadDictMsg
                        )}
                        <DictionaryDownload />
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

const readJsonFile = (fileContent: File) => {
  return new Promise<string | undefined>((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsText(fileContent, 'utf-8')
    reader.onload = (event) => {
      const content = event.target?.result as string
      try {
        const json = JSON.parse(content)
        resolve(json)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = (err) => {
      reject(err)
    }
  })
}

const saveDict = (formData, jsonData) => {
  const createDictMeta = (formData) => {
    const { name, language } = formData
    const uuid = crypto.randomUUID()
    return {
      id: 'x-dict-' + uuid,
      name: name.trim(),
      url: `/dicts/${uuid}.json`,
      language,
      description: '自定义词典',
      category: '自定义',
      tags: ['Default'],
      length: jsonData.length,
      chapterCount: Math.ceil(jsonData.length / 20),
      languageCategory: 'custom',
    }
  }

  const dictMeta = createDictMeta(formData)
  window.newLocalDictFromJson(jsonData, dictMeta)
}
