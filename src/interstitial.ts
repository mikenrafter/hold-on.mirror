import { isWebUrl } from './navigation'

interface QueryParameter { key: string; value: string }

const pageUrl = new URL(location.href)
const targetUrl = pageUrl.searchParams.get('target') ?? ''
const loaded = pageUrl.searchParams.get('loaded') === 'true'
const form = document.querySelector('form') as HTMLFormElement
const scheme = document.querySelector('#scheme') as HTMLSelectElement
const username = document.querySelector('#username') as HTMLInputElement
const password = document.querySelector('#password') as HTMLInputElement
const hostname = document.querySelector('#hostname') as HTMLInputElement
const port = document.querySelector('#port') as HTMLInputElement
const pathRows = document.querySelector('#path-rows') as HTMLElement
const queryRows = document.querySelector('#query-rows') as HTMLElement
const fragment = document.querySelector('#fragment') as HTMLInputElement
const link = document.querySelector('#navigate-link') as HTMLAnchorElement
const status = document.querySelector('#status') as HTMLElement

function button(label: string, onClick: () => void): HTMLButtonElement {
	const element = document.createElement('button')
	element.type = 'button'
	element.textContent = label
	element.addEventListener('click', onClick)
	return element
}

function textInput(value: string, label: string): HTMLInputElement {
	const element = document.createElement('input')
	element.type = 'text'
	element.value = value
	element.setAttribute('aria-label', label)
	return element
}

function addPathRow(value: string): void {
	const row = document.createElement('div')
	row.className = 'editable-row'
	const input = textInput(value, 'Path element')
	row.append(input, button('Delete', () => { row.remove(); updateUrl() }))
	pathRows.append(row)
}

function addQueryRow(parameter: QueryParameter = { key: '', value: '' }): void {
	const row = document.createElement('div')
	row.className = 'editable-row query-row'
	const key = textInput(parameter.key, 'Query parameter name')
	const value = textInput(parameter.value, 'Query parameter value')
	row.append(key, value, button('Delete', () => { row.remove(); updateUrl() }))
	key.addEventListener('input', updateUrl)
	value.addEventListener('input', updateUrl)
	queryRows.append(row)
}

function currentUrl(): URL {
	const url = new URL(`${scheme.value}://${hostname.value}`)
	if (username.value) url.username = username.value
	if (password.value) url.password = password.value
	if (port.value) url.port = port.value
	const path = Array.from(pathRows.querySelectorAll('input')).map((input) => input.value)
	url.pathname = `/${path.map((part) => encodeURIComponent(part)).join('/')}`
	const params = Array.from(queryRows.children)
		.map((row) => Array.from(row.querySelectorAll('input')))
		.map(([key, value]) => [key?.value ?? '', value?.value ?? ''] as const)
		.filter(([key]) => key.length > 0)
	url.search = ''
	for (const [key, value] of params) url.searchParams.append(key, value)
	url.hash = fragment.value ? `#${fragment.value.replace(/^#/, '')}` : ''
	return url
}

function updateUrl(): void {
	const url = currentUrl()
	link.href = url.toString()
	pageUrl.searchParams.set('target', url.toString())
	pageUrl.searchParams.set('loaded', 'true')
	history.replaceState(null, '', pageUrl.toString())
	status.textContent = url.toString()
}

function populate(): void {
	let url: URL
	try { url = new URL(targetUrl) } catch { status.textContent = 'The intercepted URL could not be parsed.'; return }
	if (!isWebUrl(url.toString())) { status.textContent = 'Only HTTP and HTTPS URLs can be navigated.'; return }
	scheme.value = url.protocol.slice(0, -1)
	username.value = decodeURIComponent(url.username)
	password.value = decodeURIComponent(url.password)
	hostname.value = url.hostname
	port.value = url.port
	fragment.value = url.hash.slice(1)
	for (const part of url.pathname.split('/').slice(1)) addPathRow(decodeURIComponent(part))
	if (pathRows.children.length === 0) addPathRow('')
	for (const [key, value] of url.searchParams) addQueryRow({ key, value })
	updateUrl()
}

document.querySelector('#add-path')?.addEventListener('click', () => { addPathRow(''); updateUrl() })
document.querySelector('#add-query')?.addEventListener('click', () => { addQueryRow(); updateUrl() })
form.addEventListener('input', updateUrl)
form.addEventListener('submit', (event) => { event.preventDefault(); location.assign(link.href) })

if (loaded && isWebUrl(targetUrl)) {
	location.replace(targetUrl)
} else {
	pageUrl.searchParams.set('loaded', 'true')
	history.replaceState(null, '', pageUrl.toString())
	populate()
}
