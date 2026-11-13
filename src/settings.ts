export const SETTINGS_STORAGE_KEY = 'holdOn.settings'

export interface HoldOnSettings {
	excludedUrlPatterns: string[]
}

export const DEFAULT_SETTINGS: HoldOnSettings = { excludedUrlPatterns: [] }

export function sanitizeSettings(value: unknown): HoldOnSettings {
	if (value === null || typeof value !== 'object') return { ...DEFAULT_SETTINGS }
	const patterns = (value as Partial<HoldOnSettings>).excludedUrlPatterns
	return {
		excludedUrlPatterns: Array.isArray(patterns)
			? patterns.filter((pattern): pattern is string => typeof pattern === 'string' && pattern.trim().length > 0)
			: []
	}
}

export function matchesExcludedPattern(url: string, patterns: string[]): boolean {
	return patterns.some((source) => {
		try { return new RegExp(source).test(url) } catch { return false }
	})
}

export async function loadSettings(): Promise<HoldOnSettings> {
	const payload = await browser.storage.local.get(SETTINGS_STORAGE_KEY)
	return sanitizeSettings(payload[SETTINGS_STORAGE_KEY])
}

export async function saveSettings(settings: HoldOnSettings): Promise<HoldOnSettings> {
	const sanitized = sanitizeSettings(settings)
	await browser.storage.local.set({ [SETTINGS_STORAGE_KEY]: sanitized })
	return sanitized
}
