import ui from "./ui";

let translations: Record<string, string> = {};
const lang = document.documentElement.lang;
if (lang !== "en") {
	fetch(`/i18n/${lang}.json`)
		.then(response => response.json())
		.then(data => {
			translations = data;
		});
}

export function i18n(text: string, id?: string): string {
	const key = id ?? text;
	return translations[key] ?? text;
}

document.addEventListener("DOMContentLoaded", () => {
	ui.onLoad();
});
