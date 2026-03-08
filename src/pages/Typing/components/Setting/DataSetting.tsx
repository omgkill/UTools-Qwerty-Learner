import styles from './index.module.css'
import * as ScrollArea from '@radix-ui/react-scroll-area'

export default function DataSetting() {
  return (
    <ScrollArea.Root className="flex-1 select-none overflow-y-auto ">
      <ScrollArea.Viewport className="h-full w-full px-3">
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <span className={styles.sectionLabel}>数据存储</span>
            <span className={styles.sectionDescription}>
              您的学习数据已通过 <strong>uTools 云同步</strong> 自动保存。
              换设备或重新安装后，数据会自动恢复。
            </span>
          </div>
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex touch-none select-none bg-transparent " orientation="vertical"></ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )
}
