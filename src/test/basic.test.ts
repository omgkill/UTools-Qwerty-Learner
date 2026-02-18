import { describe, expect, it } from 'vitest'

describe('Basic Test', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2)
  })

  it('should work with strings', () => {
    expect('hello').toBe('hello')
  })
})
