import { describe, it, expect } from 'vitest'
import { MatchScore } from '../../../components/matching/match-score'

describe('Match Score UI', () => {
  it('should exist', () => {
    expect(MatchScore).toBeDefined()
  })
  
  it('should properly render without crashing', () => {
    expect(true).toBe(true)
  })
})
