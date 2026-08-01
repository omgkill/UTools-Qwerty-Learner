import styles from './index.module.css'
import { dailyLimitConfigAtom, hotkeyConfigAtom, isIgnoreCaseAtom, isShowAnswerOnHoverAtom, isShowPrevAndNextWordAtom, isTextSelectableAtom, randomConfigAtom, simulatedDateAtom } from '@/store'
import { setDailyLimit } from '@/features/typing/domain'
import { clearAllData, restartPlugin } from '@/platform/utools'
import { setSimulatedDate as applySimulatedDate, getTodayString, resetTimeDiff } from '@/utils/timeService'
import { Switch } from '@headlessui/react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { useAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

interface AdvancedSettingProps {
  onReloadSession?: () => void
}

export default function AdvancedSetting({ onReloadSession }: AdvancedSettingProps) {
  const [randomConfig, setRandomConfig] = useAtom(randomConfigAtom)
  const [isShowPrevAndNextWord, setIsShowPrevAndNextWord] = useAtom(isShowPrevAndNextWordAtom)
  const [isIgnoreCase, setIsIgnoreCase] = useAtom(isIgnoreCaseAtom)
  const [isTextSelectable, setIsTextSelectable] = useAtom(isTextSelectableAtom)
  const [isShowAnswerOnHover, setIsShowAnswerOnHover] = useAtom(isShowAnswerOnHoverAtom)
  const [dailyLimitConfig, setDailyLimitConfig] = useAtom(dailyLimitConfigAtom)
  const [hotkeyConfig, setHotkeyConfig] = useAtom(hotkeyConfigAtom)
  const [simulatedDate, setSimulatedDate] = useAtom(simulatedDateAtom)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    setDailyLimit(dailyLimitConfig.dailyLimit)
  }, [dailyLimitConfig.dailyLimit])

  const onToggleRandom = useCallback(
    (checked: boolean) => {
      setRandomConfig((prev) => ({
        ...prev,
        isOpen: checked,
      }))
    },
    [setRandomConfig],
  )

  const onToggleLastAndNextWord = useCallback(
    (checked: boolean) => {
      setIsShowPrevAndNextWord(checked)
    },
    [setIsShowPrevAndNextWord],
  )

  const onToggleIgnoreCase = useCallback(
    (checked: boolean) => {
      setIsIgnoreCase(checked)
    },
    [setIsIgnoreCase],
  )

  const onToggleTextSelectable = useCallback(
    (checked: boolean) => {
      setIsTextSelectable(checked)
    },
    [setIsTextSelectable],
  )
  const onToggleShowAnswerOnHover = useCallback(
    (checked: boolean) => {
      setIsShowAnswerOnHover(checked)
    },
    [setIsShowAnswerOnHover],
  )

  const handleClearAllData = useCallback(() => {
    const result = clearAllData()
    if (result) {
      toast.success('数据已清空，即将重新打开...')
      setTimeout(() => {
        restartPlugin()
      }, 1000)
    } else {
      toast.error('清空数据失败')
    }
    setShowConfirm(false)
  }, [])

  const handleDailyLimitChange = useCallback(
    (value: number) => {
      const limit = Math.max(5, Math.min(100, value))
      setDailyLimitConfig((prev) => ({
        ...prev,
        dailyLimit: limit,
      }))
    },
    [setDailyLimitConfig],
  )

  const handleHotkeyChange = useCallback(
    (key: 'viewDetail' | 'goBack', value: string) => {
      setHotkeyConfig((prev) => ({
        ...prev,
        [key]: value.toLowerCase(),
      }))
    },
    [setHotkeyConfig],
  )

  const handleSimulatedDateChange = useCallback(
    (dateStr: string) => {
      setSimulatedDate(dateStr)
      if (dateStr) {
        applySimulatedDate(dateStr)
        toast.success(`已切换到模拟日期 ${dateStr}，正在重新加载学习会话...`)
      } else {
        resetTimeDiff()
        toast.success('已恢复真实时间，正在重新加载学习会话...')
      }
      onReloadSession?.()
    },
    [onReloadSession, setSimulatedDate],
  )

  const handleAdvanceOneDay = useCallback(() => {
    const base = simulatedDate || formatDate(new Date())
    handleSimulatedDateChange(addDays(base, 1))
  }, [handleSimulatedDateChange, simulatedDate])

  return (
    <ScrollArea.Root className="flex-1 select-none overflow-y-auto ">
      <ScrollArea.Viewport className="h-full w-full px-3">
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>每日学习上限</span>
            <span className={styles.sectionDescription}>
              每天最多学习的单词数量（复习+新词）。推荐值：轻松模式10个、标准模式20个、进取模式30个
            </span>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={dailyLimitConfig.dailyLimit}
                onChange={(e) => handleDailyLimitChange(Number(e.target.value))}
                className="h-2 w-40 cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
              />
              <span className="w-16 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                {dailyLimitConfig.dailyLimit} 个/天
              </span>
            </div>
          </div>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>章节乱序</span>
            <span className={styles.sectionDescription}>开启后，每次练习章节中单词会随机排序。下一章节生效</span>
            <div className={styles.switchBlock}>
              <Switch checked={randomConfig.isOpen} onChange={onToggleRandom} className="switch-root">
                <span aria-hidden="true" className="switch-thumb" />
              </Switch>
              <span className="text-right text-xs font-normal leading-tight text-gray-600">{`随机已${
                randomConfig.isOpen ? '开启' : '关闭'
              }`}</span>
            </div>
          </div>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>练习时展示上一个/下一个单词</span>
            <span className={styles.sectionDescription}>开启后，练习中会在上方展示上一个/下一个单词</span>
            <div className={styles.switchBlock}>
              <Switch checked={isShowPrevAndNextWord} onChange={onToggleLastAndNextWord} className="switch-root">
                <span aria-hidden="true" className="switch-thumb" />
              </Switch>
              <span className="text-right text-xs font-normal leading-tight text-gray-600">{`展示单词已${
                isShowPrevAndNextWord ? '开启' : '关闭'
              }`}</span>
            </div>
          </div>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>是否忽略大小写</span>
            <span className={styles.sectionDescription}>开启后，输入时不区分大小写，如输入“hello”和“Hello”都会被认为是正确的</span>
            <div className={styles.switchBlock}>
              <Switch checked={isIgnoreCase} onChange={onToggleIgnoreCase} className="switch-root">
                <span aria-hidden="true" className="switch-thumb" />
              </Switch>
              <span className="text-right text-xs font-normal leading-tight text-gray-600">{`忽略大小写已${
                isIgnoreCase ? '开启' : '关闭'
              }`}</span>
            </div>
          </div>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>是否允许选择文本</span>
            <span className={styles.sectionDescription}>开启后，可以通过鼠标选择文本 </span>
            <div className={styles.switchBlock}>
              <Switch checked={isTextSelectable} onChange={onToggleTextSelectable} className="switch-root">
                <span aria-hidden="true" className="switch-thumb" />
              </Switch>
              <span className="text-right text-xs font-normal leading-tight text-gray-600">{`选择文本已${
                isTextSelectable ? '开启' : '关闭'
              }`}</span>
            </div>
          </div>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>是否允许默写模式下显示提示</span>
            <span className={styles.sectionDescription}>开启后，可以通过鼠标 hover 单词显示正确答案 </span>
            <div className={styles.switchBlock}>
              <Switch checked={isShowAnswerOnHover} onChange={onToggleShowAnswerOnHover} className="switch-root">
                <span aria-hidden="true" className="switch-thumb" />
              </Switch>
              <span className="text-right text-xs font-normal leading-tight text-gray-600">{`显示提示已${
                isShowAnswerOnHover ? '开启' : '关闭'
              }`}</span>
            </div>
          </div>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>快捷键设置</span>
            <span className={styles.sectionDescription}>自定义查看详细释义和返回的快捷键</span>
            <div className="mt-2 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-32 text-sm text-gray-600 dark:text-gray-400">查看详细释义</span>
                <input
                  type="text"
                  value={hotkeyConfig.viewDetail}
                  onChange={(e) => handleHotkeyChange('viewDetail', e.target.value)}
                  className="h-8 w-32 rounded border border-gray-300 px-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  placeholder="ctrl+1"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-32 text-sm text-gray-600 dark:text-gray-400">返回</span>
                <input
                  type="text"
                  value={hotkeyConfig.goBack}
                  onChange={(e) => handleHotkeyChange('goBack', e.target.value)}
                  className="h-8 w-32 rounded border border-gray-300 px-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  placeholder="ctrl+2"
                />
              </div>
            </div>
          </div>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>模拟日期（测试用）</span>
            <span className={styles.sectionDescription}>
              用于测试间隔重复学习流程：学完一天后将日期切换到下一天，程序会按新日期重新获取到期复习和新词。当前生效日期：{getTodayString()}
              {simulatedDate && `（真实日期：${formatDate(new Date())}）`}
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={simulatedDate}
                onChange={(e) => handleSimulatedDateChange(e.target.value)}
                className="h-8 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              />
              <button
                type="button"
                className="rounded-lg border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900"
                onClick={handleAdvanceOneDay}
              >
                +1天
              </button>
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                onClick={() => handleSimulatedDateChange('')}
                disabled={!simulatedDate}
              >
                恢复真实时间
              </button>
            </div>
          </div>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>清空所有数据</span>
            <span className={styles.sectionDescription}>
              清空所有词典数据、练习记录和设置。此操作<strong className="text-red-500">不可撤销</strong>。
            </span>
            <div className="mt-2 flex items-center gap-3">
              <button
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                type="button"
                onClick={() => setShowConfirm(true)}
              >
                清空所有数据
              </button>
            </div>
          </div>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-200">确认清空所有数据？</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                此操作将删除所有词典、练习记录和设置，且不可恢复。
              </p>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  onClick={() => setShowConfirm(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                  onClick={handleClearAllData}
                >
                  确认清空
                </button>
              </div>
            </div>
          </div>
        )}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex touch-none select-none bg-transparent " orientation="vertical"></ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )
}
