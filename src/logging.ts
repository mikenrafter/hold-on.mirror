const LOG_PREFIX = '[Hold On]'

/**
 * Event logging records full URLs, including any credentials in them, so it
 * is off unless turned on for troubleshooting (`setDebugLogging(true)`, or
 * flip this default in a local build).
 */
let debugLogging = false

export function setDebugLogging(enabled: boolean): void {
	debugLogging = enabled
}

export function log(event: string, details?: unknown): void {
	if (!debugLogging) return
	if (details === undefined) {
		console.info(`${LOG_PREFIX} ${event}`)
		return
	}
	console.info(`${LOG_PREFIX} ${event}`, details)
}

/** Always logged. Callers pass the error only, never a URL. */
export function logError(event: string, error: unknown): void {
	console.error(`${LOG_PREFIX} ${event}`, error)
}
