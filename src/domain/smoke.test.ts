import { describe, expect, it } from 'vitest'

// Plan-mandated Vitest sanity check: proves `npm test` runs green.
// Asserts a trivial deterministic expectation — no I/O, no side effects,
// keeping src/domain/ pure.
describe('vitest smoke test', () => {
  it('evaluates a deterministic expectation', () => {
    expect(1 + 1).toBe(2)
  })
})
