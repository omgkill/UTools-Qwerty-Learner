import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { advanceDays, advanceTime, getCurrentDate, getLocalTimeString, getTodayStartTime, getTodayString, getTomorrowDateString, now, resetTimeDiff, setTimeTo } from '@/utils/timeService'

describe('timeService', () => {
  beforeEach(() => {
    resetTimeDiff()
  })

  afterEach(() => {
    resetTimeDiff()
  })

  describe('now', () => {
    it('should return current timestamp', () => {
      const before = Date.now()
      const result = now()
      const after = Date.now()
      
      expect(result).toBeGreaterThanOrEqual(before)
      expect(result).toBeLessThanOrEqual(after + 10)
    })

    it('should return modified time after setTimeTo', () => {
      const targetTime = new Date('2024-06-15T12:00:00').getTime()
      setTimeTo(targetTime)
      
      const result = now()
      expect(result).toBe(targetTime)
    })
  })

  describe('getCurrentDate', () => {
    it('should return current Date object', () => {
      const result = getCurrentDate()
      expect(result instanceof Date).toBe(true)
    })

    it('should return modified date after setTimeTo', () => {
      const targetDate = new Date('2024-06-15T12:00:00')
      setTimeTo(targetDate)
      
      const result = getCurrentDate()
      expect(result.getFullYear()).toBe(2024)
      expect(result.getMonth()).toBe(5)
      expect(result.getDate()).toBe(15)
    })
  })

  describe('getTodayString', () => {
    it('should return date string in YYYY-MM-DD format', () => {
      const result = getTodayString()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should return correct date string', () => {
      setTimeTo(new Date('2024-06-15T12:00:00'))
      const result = getTodayString()
      expect(result).toBe('2024-06-15')
    })

    it('should pad month and day with zeros', () => {
      setTimeTo(new Date('2024-01-05T12:00:00'))
      const result = getTodayString()
      expect(result).toBe('2024-01-05')
    })
  })

  describe('getTodayStartTime', () => {
    it('should return timestamp for start of today', () => {
      setTimeTo(new Date('2024-06-15T15:30:45'))
      const result = getTodayStartTime()
      
      const expectedDate = new Date(2024, 5, 15)
      expect(result).toBe(expectedDate.getTime())
    })

    it('should return same value for same day', () => {
      setTimeTo(new Date('2024-06-15T00:00:00'))
      const result1 = getTodayStartTime()
      
      setTimeTo(new Date('2024-06-15T23:59:59'))
      const result2 = getTodayStartTime()
      
      expect(result1).toBe(result2)
    })
  })

  describe('getTomorrowDateString', () => {
    it('should return tomorrow date string', () => {
      setTimeTo(new Date('2024-06-15T12:00:00'))
      const result = getTomorrowDateString()
      expect(result).toBe('2024-06-16')
    })

    it('should handle month boundary', () => {
      setTimeTo(new Date('2024-06-30T12:00:00'))
      const result = getTomorrowDateString()
      expect(result).toBe('2024-07-01')
    })

    it('should handle year boundary', () => {
      setTimeTo(new Date('2024-12-31T12:00:00'))
      const result = getTomorrowDateString()
      expect(result).toBe('2025-01-01')
    })
  })

  describe('setTimeTo', () => {
    it('should set time from Date object', () => {
      const targetDate = new Date('2024-06-15T12:00:00')
      setTimeTo(targetDate)
      
      expect(now()).toBe(targetDate.getTime())
    })

    it('should set time from string', () => {
      setTimeTo('2024-06-15T12:00:00')
      
      const expectedTime = new Date('2024-06-15T12:00:00').getTime()
      expect(now()).toBe(expectedTime)
    })

    it('should set time from number', () => {
      const targetTime = 1718452800000
      setTimeTo(targetTime)
      
      expect(now()).toBe(targetTime)
    })
  })

  describe('advanceTime', () => {
    it('should advance time by specified milliseconds', () => {
      const before = now()
      advanceTime(1000)
      const after = now()
      
      expect(after - before).toBe(1000)
    })

    it('should handle negative values', () => {
      const before = now()
      advanceTime(-1000)
      const after = now()
      
      expect(after - before).toBe(-1000)
    })

    it('should accumulate advances', () => {
      advanceTime(1000)
      advanceTime(2000)
      advanceTime(3000)
      
      const result = now()
      const expected = Date.now() + 6000
      expect(result).toBe(expected)
    })
  })

  describe('advanceDays', () => {
    it('should advance time by specified days', () => {
      const before = now()
      advanceDays(1)
      const after = now()
      
      expect(after - before).toBe(24 * 60 * 60 * 1000)
    })

    it('should advance multiple days', () => {
      const before = now()
      advanceDays(7)
      const after = now()
      
      expect(after - before).toBe(7 * 24 * 60 * 60 * 1000)
    })

    it('should handle zero days', () => {
      const before = now()
      advanceDays(0)
      const after = now()
      
      expect(after - before).toBe(0)
    })
  })

  describe('resetTimeDiff', () => {
    it('should reset time difference to zero', () => {
      setTimeTo(new Date('2024-06-15'))
      resetTimeDiff()
      
      const result = now()
      const expected = Date.now()
      expect(Math.abs(result - expected)).toBeLessThan(10)
    })

    it('should clear all previous advances', () => {
      advanceTime(10000)
      advanceDays(5)
      resetTimeDiff()
      
      const result = now()
      const expected = Date.now()
      expect(Math.abs(result - expected)).toBeLessThan(10)
    })
  })

  describe('getLocalTimeString', () => {
    it('should return formatted local time string', () => {
      setTimeTo(new Date('2024-06-15T14:30:45'))
      const result = getLocalTimeString()
      
      expect(result).toBe('2024-06-15 14:30:45')
    })

    it('should pad values with zeros', () => {
      setTimeTo(new Date('2024-01-05T09:05:03'))
      const result = getLocalTimeString()
      
      expect(result).toBe('2024-01-05 09:05:03')
    })
  })

  describe('integration scenarios', () => {
    it('should simulate passing of days', () => {
      setTimeTo(new Date('2024-06-15T12:00:00'))
      expect(getTodayString()).toBe('2024-06-15')
      
      advanceDays(1)
      expect(getTodayString()).toBe('2024-06-16')
      
      advanceDays(5)
      expect(getTodayString()).toBe('2024-06-21')
    })

    it('should calculate correct tomorrow after multiple advances', () => {
      setTimeTo(new Date('2024-06-15T12:00:00'))
      
      advanceDays(3)
      expect(getTomorrowDateString()).toBe('2024-06-19')
    })

    it('should handle time manipulation for testing', () => {
      const testDate = new Date('2024-12-25T00:00:00')
      setTimeTo(testDate)
      
      expect(getTodayString()).toBe('2024-12-25')
      expect(getTomorrowDateString()).toBe('2024-12-26')
      expect(getTodayStartTime()).toBe(new Date(2024, 11, 25).getTime())
    })
  })
})
