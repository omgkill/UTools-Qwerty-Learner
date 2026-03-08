import { languageType } from '../constants'
import { InnerContext } from '../index'
import ConfirmDialog from './ConfirmationDialog'
import { Dialog, Transition } from '@headlessui/react'
import type { ChangeEvent, FC, FormEvent, MouseEvent } from 'react'
import { Fragment, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import IconDelete from '~icons/mdi/delete'
import IconX from '~icons/tabler/x'
import EditIcon from '~icons/uil/edit-alt'
import type { LanguageType, WordBank } from '@/types'

type Form4EditDictProps = {
  wordBankId: string
}

type FormData = WordBank & { language: LanguageType }

const Form4EditDict: FC<Form4EditDictProps> = ({ wordBankId }) => {
  const [formData, setFormData] = useState<FormData>({ name: '', language: 'en' } as FormData)

  const [wordBanksList, setWordBanksList] = useState<WordBank[]>([])
  const [wordBankIndex, setWordBankIndex] = useState(0)

  const handleRefresh = useContext(InnerContext)

  const [isOpen, setIsOpen] = useState(false)
  function closeModal() {
    setIsOpen(false)
    setFormData({ name: '', language: 'en' } as FormData)
  }
  async function openModal(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    const config = await window.readLocalWordBankConfig()
    setWordBanksList([...config])
    for (let i = 0; i < config.length; i++) {
      if (config[i].id === wordBankId) {
        setWordBankIndex(i)
        setFormData({ ...config[i] } as FormData)
        break
      }
    }
    setIsOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (formData.name.trim().length <= 0) {
      toast.info('词库名称不能为空')
      return
    }
    if (formData.name.trim().length >= 10) {
      toast.info('词库名称过长(应少于10个字)')
      return
    }
    if ((formData.description || '').trim().length >= 10) {
      toast.info('词库描述过长(应少于10个字)')
      return
    }

    const newWordBankInfo = Object.assign({}, wordBanksList[wordBankIndex], {
      ...formData,
    })
    const nextList = [...wordBanksList]
    nextList[wordBankIndex] = newWordBankInfo
    await window.writeLocalWordBankConfig(nextList)
    window.initLocalWordBanks()
    handleRefresh()

    setIsOpen(false)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    })
  }

  const [confirmIsOpen, setConfirmIsOpen] = useState(false)
  async function handleDelClick(event?: MouseEvent<HTMLButtonElement>) {
    event?.preventDefault()

    const result = await window.delLocalWordBank(wordBankId)
    if (result) {
      toast.success('删除成功')
    } else {
      toast.error('删除失败')
    }
    window.initLocalWordBanks()
    handleRefresh()
    setIsOpen(false)
  }

  return (
    <>
      <button className={`my-3 mr-3 text-gray-300 hover:text-gray-500 hover:dark:text-blue-400`} onClick={openModal} title="修改词库信息">
        <EditIcon />
      </button>
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
                <Dialog.Panel className="w-200  transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      closeModal()
                    }}
                    title="关闭对话框"
                  >
                    <IconX className="absolute right-7 top-5 cursor-pointer text-gray-400" />
                  </button>
                  <Dialog.Title as="h2" className="mb-8 text-center text-xl font-medium leading-6 text-gray-800 dark:text-gray-200">
                    修改词库
                  </Dialog.Title>
                  <form onSubmit={handleSubmit} className="p-2">
                    <div className="mb-8 grid grid-cols-[1fr_5fr]">
                      <label htmlFor="name" className="mb-4 block font-bold text-gray-600 dark:text-gray-200">
                        词库名称:
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-400 p-2"
                      />
                    </div>
                    <div className="mb-8 grid grid-cols-[1fr_5fr]">
                      <label htmlFor="description" className="mb-4 block font-bold text-gray-600 dark:text-gray-200">
                        词库描述:
                      </label>
                      <input
                        type="text"
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-400 p-2"
                      />
                    </div>
                    <div className="mb-8 grid grid-cols-[1fr_5fr]">
                      <label className="mb-4 block font-bold text-gray-600 dark:text-gray-200">类型:</label>
                      <select
                        name="language"
                        value={formData.language}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-400 p-2"
                      >
                        {languageType.map((item) => (
                          <option value={item.type} key={item.type}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-16 flex justify-end">
                      <button
                        className="text-bold mx-4 h-15 w-[10%] rounded-lg bg-red-400 font-bold text-white hover:bg-red-600 dark:text-gray-200"
                        onClick={() => {
                          setConfirmIsOpen(true)
                        }}
                      >
                        <div className="flex items-center justify-center">
                          <IconDelete className="h-6 w-6" />
                          删除
                        </div>
                      </button>
                      <button
                        className="text-bold h-15 w-1/4 rounded-lg bg-indigo-400 font-bold text-white dark:text-gray-200"
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
    <ConfirmDialog
        isOpen={confirmIsOpen}
        onCancel={() => {
          setConfirmIsOpen(false)
        }}
        onDelete={() => {
        handleDelClick()
        }}
    >
      确认删除此词库？
    </ConfirmDialog>
    </>
  )
}

Form4EditDict.propTypes = {
  wordBankId: (props: Record<string, unknown>, propName: string, componentName: string) => {
    if (typeof props[propName] !== 'string' || (props[propName] as string).length === 0) {
      return new Error(`${componentName}: ${propName} must be a non-empty string`)
    }
    return null
  },
}

export default Form4EditDict
