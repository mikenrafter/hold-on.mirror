export function isWebUrl(url: string): boolean {
	return /^https?:\/\//i.test(url)
}

export function interstitialUrl(extensionUrl: string, targetUrl: string): string {
	const url = new URL(extensionUrl)
	url.searchParams.set('target', targetUrl)
	return url.toString()
}
