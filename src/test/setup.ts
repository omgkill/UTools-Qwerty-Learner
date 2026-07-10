import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { vi } from 'vitest'

const showDebugLogs = process.env.VITEST_DEBUG_LOGS === 'true'

if (!showDebugLogs) {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
}
