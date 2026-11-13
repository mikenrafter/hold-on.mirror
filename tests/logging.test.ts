import { afterEach, describe, expect, it, vi } from 'vitest'
import { log, logError, setDebugLogging } from '../src/logging'

describe('logging', () => {
	afterEach(() => {
		setDebugLogging(false)
		vi.restoreAllMocks()
	})

	// Event details carry full URLs (possibly with credentials), so release builds stay quiet.
	it('does not log events by default', () => {
		const info = vi.spyOn(console, 'info').mockImplementation(() => {})
		log('request redirected to interstitial', { url: 'https://user:secret@example.com/' })
		expect(info).not.toHaveBeenCalled()
	})

	it('logs events once debug logging is on', () => {
		const info = vi.spyOn(console, 'info').mockImplementation(() => {})
		setDebugLogging(true)
		log('tabs.onCreated', { tabId: 1 })
		expect(info).toHaveBeenCalledWith('[Hold On] tabs.onCreated', { tabId: 1 })
	})

	it('always logs errors', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const failure = new Error('storage unavailable')
		logError('could not load settings', failure)
		expect(error).toHaveBeenCalledWith('[Hold On] could not load settings', failure)
	})
})
