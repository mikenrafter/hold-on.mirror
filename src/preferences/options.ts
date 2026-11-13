import { loadSettings, saveSettings } from '../settings'

const patterns = document.getElementById('patterns') as HTMLTextAreaElement
const form = document.getElementById('form') as HTMLFormElement
const status = document.getElementById('status') as HTMLParagraphElement

async function initialize(): Promise<void> {
	const settings = await loadSettings()
	patterns.value = settings.excludedUrlPatterns.join('\n')
}

form.addEventListener('submit', async (event) => {
	event.preventDefault()
	const excludedUrlPatterns = patterns.value.split('\n').map((pattern) => pattern.trim()).filter(Boolean)
	await saveSettings({ excludedUrlPatterns })
	status.textContent = 'Settings saved.'
})

void initialize()
