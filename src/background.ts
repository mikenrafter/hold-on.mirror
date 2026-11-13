import { interstitialUrl, isWebUrl } from './navigation'
import { loadSettings, matchesExcludedPattern } from './settings'
import { log, logError } from './logging'

interface CandidateTab { blockedUrl?: string }

const candidateTabs = new Map<number, CandidateTab>()
const browserCreatedTabs = new Set<number>()
const externallyCreatedWindows = new Set<number>()
let firefoxFocused: boolean | undefined

const WINDOW_ID_NONE = -1

function isMainFrame(details: { type?: string; tabId?: number }): details is { type: string; tabId: number; url: string } {
	return details.type === 'main_frame' && typeof details.tabId === 'number' && details.tabId >= 0
}


browser.windows.onFocusChanged.addListener((windowId: number) => {
	firefoxFocused = windowId !== WINDOW_ID_NONE
	log('windows.onFocusChanged', { windowId, firefoxFocused })
})

browser.windows.onCreated.addListener((window: { id?: number }) => {
	log('windows.onCreated', { windowId: window.id, firefoxFocused })
	if (firefoxFocused === false && typeof window.id === 'number') {
		externallyCreatedWindows.add(window.id)
		log('window marked external', { windowId: window.id })
	}
})

browser.windows.onRemoved.addListener((windowId: number) => {
	externallyCreatedWindows.delete(windowId)
	log('windows.onRemoved', { windowId })
})

void browser.windows.getAll().then((windows: Array<{ focused?: boolean }>) => {
	if (firefoxFocused === undefined) {
		firefoxFocused = windows.some((window) => window.focused === true)
	}
	log('initial focus state', { firefoxFocused, focusedWindowCount: windows.filter((window) => window.focused === true).length })
})

browser.tabs.onCreated.addListener((tab: { id?: number; windowId?: number }) => {
	log('tabs.onCreated', { tabId: tab.id, windowId: tab.windowId, firefoxFocused })
	if (typeof tab.id !== 'number') return
	const windowWasExternallyCreated = typeof tab.windowId === 'number' && externallyCreatedWindows.has(tab.windowId)
	if (firefoxFocused !== false && !windowWasExternallyCreated) {
		log('tab not armed: Firefox was focused', { tabId: tab.id, windowId: tab.windowId })
		return
	}
	if (browserCreatedTabs.delete(tab.id)) {
		log('tab not armed: browser navigation target', { tabId: tab.id })
		return
	}
	candidateTabs.set(tab.id, {})
	log('tab armed as external candidate', { tabId: tab.id, windowId: tab.windowId })
})

browser.tabs.onRemoved.addListener((tabId: number) => {
	candidateTabs.delete(tabId)
	browserCreatedTabs.delete(tabId)
	log('tabs.onRemoved', { tabId })
})

browser.tabs.onUpdated.addListener((tabId: number, changeInfo: unknown, tab: unknown) => {
	const changes = changeInfo as { url?: string; status?: string }
	if (changes.url !== undefined || changes.status !== undefined) {
		log('tabs.onUpdated', { tabId, changeInfo, tab })
	}
})

browser.webNavigation.onCreatedNavigationTarget.addListener((details: unknown) => {
	const navigation = details as { tabId?: number; url?: string; sourceTabId?: number; sourceFrameId?: number }
	log('webNavigation.onCreatedNavigationTarget', navigation)
	if (typeof navigation.tabId !== 'number') return
	candidateTabs.delete(navigation.tabId)
	browserCreatedTabs.add(navigation.tabId)
})

browser.webNavigation.onBeforeNavigate.addListener((details: unknown) => {
	log('webNavigation.onBeforeNavigate', details)
})

browser.webNavigation.onCommitted.addListener((details: unknown) => {
	log('webNavigation.onCommitted', details)
})

browser.webNavigation.onErrorOccurred.addListener((details: unknown) => {
	log('webNavigation.onErrorOccurred', details)
})

browser.webRequest.onBeforeRequest.addListener(
	async (details: { type?: string; tabId?: number; url?: string }) => {
		if (!isMainFrame(details) || typeof details.url !== 'string' || !isWebUrl(details.url)) return {}
		const tab = candidateTabs.get(details.tabId)
		if (!tab) return {}
		let tabSnapshot: unknown
		try {
			tabSnapshot = await browser.tabs.get(details.tabId)
		} catch (error) {
			tabSnapshot = { error: String(error) }
		}
		log('webRequest.onBeforeRequest candidate', { request: details, tabSnapshot })
		if (tab.blockedUrl === details.url) {
			candidateTabs.delete(details.tabId)
			log('request allowed as refresh', { tabId: details.tabId, url: details.url })
			return {}
		}
		let excludedUrlPatterns: string[] = []
		try {
			excludedUrlPatterns = (await loadSettings()).excludedUrlPatterns
		} catch (error) {
			logError('could not load settings; holding without exclusions', error)
		}
		if (matchesExcludedPattern(details.url, excludedUrlPatterns)) {
			candidateTabs.delete(details.tabId)
			log('request allowed by exclusion', { tabId: details.tabId, url: details.url })
			return {}
		}
		tab.blockedUrl = details.url
		candidateTabs.delete(details.tabId)
		const redirectUrl = interstitialUrl(browser.runtime.getURL('interstitial.html'), details.url)
		log('request redirected to interstitial', { tabId: details.tabId, url: details.url, redirectUrl })
		return { redirectUrl }
	},
	{ urls: ['<all_urls>'] },
	['blocking']
)

browser.webRequest.onErrorOccurred.addListener((details: unknown) => {
	log('webRequest.onErrorOccurred', details)
})
