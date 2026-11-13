/**
 * Regenerates the product-page stills in product-page/ from a real Firefox
 * with Hold On loaded, on a private Xvfb display:
 *
 *   held      a link from another app, full of tracking parameters, held
 *             before it loads
 *   cleaned   the same page after deleting the tracking parameters
 *   edit-path the destination and path rows, with the host and a path element
 *             changed
 *   options   two exclusion patterns in the add-on's options (about:addons)
 *
 * Firefox only holds a tab that another application opened while Firefox was
 * not focused, which the harness cannot reproduce on Xvfb. The held scenes
 * open the holding page with the same `?target=` URL the background script
 * redirects to, so the page on screen is the one users see.
 *
 * The harness is firefox-addon-live (a flake input; see flake.nix), linked
 * into the repo as `.firefox-addon-live` by `nix develop`.
 *
 * Usage (inside `nix develop`):
 *   npm run capture:readme                  # every scene
 *   npm run capture:readme -- options       # only these scenes
 *   OUT_DIR=/tmp/shots npm run capture:readme
 */

import { resolve } from 'node:path'
import { GLIDE, openAddonPreferences, runCaptures, settle, waitFor, type FirefoxSession } from '../.firefox-addon-live/src/index'

const EXTENSION_ID = 'hold-on@mikenrafter'
const EXTENSION_SOURCE = resolve(import.meta.dirname, '../src')

const TRACKED_URL = 'https://news.example.com/article/2026/city-council-vote?utm_source=newsletter&utm_medium=email&utm_campaign=weekly&fbclid=IwAR0abc123&ref=share#comments'
const DOCS_URL = 'https://m.docs.example.org/guides/v2/install/linux?lang=en'

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))

await runCaptures({
	outDir: resolve(import.meta.dirname, '../product-page'),
	session: {
		addon: { source: EXTENSION_SOURCE, id: EXTENSION_ID },
		bookmarksToolbar: false,
	},
	scenes: {
		held: {
			async run(session, kit) {
				await openHeldPage(session, TRACKED_URL)
				await settle(session, { x: 760, y: 540 })
				await kit.still('held')
			},
		},

		cleaned: {
			async run(session, kit) {
				await openHeldPage(session, TRACKED_URL)
				await settle(session, { x: 760, y: 540 })
				await scrollTo(session, '#query-rows')
				// Delete every tracking row; `ref=share` goes too.
				for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'ref']) {
					await session.realClick({ content: await queryDeleteButton(session, key) }, { glide: GLIDE })
					await sleep(250)
				}
				await scrollTo(session, '#status')
				await session.pointerToPoint(760, 540)
				await sleep(400)
				await kit.still('cleaned')
			},
		},

		'edit-path': {
			async run(session, kit) {
				await openHeldPage(session, DOCS_URL)
				await settle(session, { x: 760, y: 540 })
				await replaceValue(session, '#hostname', 'docs.example.org')
				await replaceValue(session, '#path-rows .editable-row:nth-child(2) input', 'v3')
				await session.content('document.activeElement?.blur(); return true')
				await scrollTo(session, 'fieldset:nth-of-type(2)', 'center')
				await session.pointerToPoint(760, 540)
				await sleep(400)
				await kit.still('edit-path')
			},
		},

		options: {
			async run(session, kit) {
				await openAddonPreferences(session)
				await settle(session, { x: 760, y: 540 })
				await session.realClick({ inlineOptions: '#patterns' }, { glide: GLIDE })
				await session.type('^https://(www\\.)?github\\.com/')
				await session.keys('Return')
				await session.type('^https://docs\\.example\\.org/')
				await session.realClick({ inlineOptions: 'button[type="submit"]' }, { glide: GLIDE })
				await sleep(600)
				await session.pointerToPoint(760, 540)
				await sleep(400)
				await kit.still('options')
			},
		},
	},
})

/**
 * Opens the holding page for `target`, as the background script's redirect
 * does. The page rewrites its own URL (`loaded=true`) once shown, so this
 * waits on the document rather than on an exact URL.
 */
async function openHeldPage(session: FirefoxSession, target: string): Promise<void> {
	const url = `${session.extensionOrigin}/interstitial.html?target=${encodeURIComponent(target)}`
	await session.chrome(`
		const tab = gBrowser.addTab(arguments[0], { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() })
		gBrowser.selectedTab = tab
		return true`, [url])
	await waitFor(async () => await session.content(`return document.readyState === 'complete' && document.querySelector('#status')?.textContent ? true : null`).catch(() => null) as true | null ?? undefined, 15_000, 'Holding page never loaded')
	await sleep(300)
}

/** Selector for the Delete button of the query row named `key`. */
async function queryDeleteButton(session: FirefoxSession, key: string): Promise<string> {
	const index = await session.content(`
		const rows = Array.from(document.querySelectorAll('#query-rows .query-row'))
		return rows.findIndex((row) => row.querySelector('input').value === arguments[0])`, [key]) as number
	if (index < 0) throw new Error(`No query row named ${key}`)
	return `#query-rows .query-row:nth-child(${index + 1}) button`
}

async function scrollTo(session: FirefoxSession, selector: string, block: 'start' | 'center' | 'end' = 'end'): Promise<void> {
	await session.content(`document.querySelector(arguments[0]).scrollIntoView({ block: arguments[1] }); return true`, [selector, block])
	await sleep(300)
}

/** Clicks `selector`, selects its text and types `value` over it. */
async function replaceValue(session: FirefoxSession, selector: string, value: string): Promise<void> {
	await scrollTo(session, selector, 'center')
	await session.realClick({ content: selector }, { glide: GLIDE })
	await session.keys('ctrl+a')
	await session.type(value)
	await sleep(250)
}
