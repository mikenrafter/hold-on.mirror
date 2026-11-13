import { describe, expect, it } from 'vitest'
import { isWebUrl } from '../src/navigation'

describe('navigation helpers', () => {
	it('only treats http and https as web pages', () => {
		expect(isWebUrl('https://example.com')).toBe(true)
		expect(isWebUrl('about:blank')).toBe(false)
	})
})
