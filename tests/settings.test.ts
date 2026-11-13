import { describe, expect, it } from 'vitest'
import { matchesExcludedPattern, sanitizeSettings } from '../src/settings'

describe('settings', () => {
	it('starts with no exclusions', () => expect(sanitizeSettings(undefined)).toEqual({ excludedUrlPatterns: [] }))
	it('removes empty and non-string patterns', () => expect(sanitizeSettings({ excludedUrlPatterns: ['', '  ', '^https://ok', 42] })).toEqual({ excludedUrlPatterns: ['^https://ok'] }))
	it('ignores invalid regexes without disabling the extension', () => {
		expect(matchesExcludedPattern('https://example.com', ['[', 'example\\.com'])).toBe(true)
		expect(matchesExcludedPattern('https://other.test', ['['])).toBe(false)
	})
})
