import { describe, it, expect } from 'vitest'
import { formatAnthropicError } from './anthropic-config'

describe('formatAnthropicError', () => {
  it('detects exhausted Anthropic credits', () => {
    const err = {
      status: 400,
      message:
        '400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."}}',
    }
    expect(formatAnthropicError(err)).toMatch(/credits exhausted/i)
  })
})
