import { i18n } from ".";
import {
	Tweak,
	enabledTweaks,
	tweaksData,
	requiredByMap,
	recommendedByMap,
	updateEnabled,
	buildDependencyMaps,
	saveClipboard,
	setTweaksData,
	updateRecommendedVisuals,
} from "./tweaks";

let tweaksGrid: HTMLDivElement;
let popup: HTMLDivElement;
let contextMenu: HTMLDivElement;
let clipboard: HTMLDivElement;
let importHashInput: HTMLInputElement;
let importButton: HTMLButtonElement;
let tweakElements: Map<string, HTMLElement> = new Map();
let currentTweak: Tweak | null = null;

function addDependencyInfo(map: Map<string, string[]>, label: string, tweakId: string): string {
	const dependencies = map.get(tweakId) || [];
	const active = dependencies.filter(id => enabledTweaks.includes(id));
	if (!active.length) return "";

	const names = active.map(id => tweaksData.find(t => t.id === id)?.name || id).join(", ");
	return `\n\n${label} ${names}`;
}

function showTweakPopup(card: HTMLElement, tweak: Tweak) {
	let popupText = tweak.desc;
	popupText += addDependencyInfo(requiredByMap, i18n("Required by"), tweak.id);
	popupText += addDependencyInfo(recommendedByMap, i18n("Recommended by"), tweak.id);

	popup.innerText = popupText;
	popup.style.left = `${card.offsetLeft}px`;
	popup.style.top = `${card.offsetTop}px`;

	popup.hidden = false;
}

function hideTweakPopup() {
	popup.hidden = true;
}

// breaks on scroll
function rotateCard(event: MouseEvent, element: HTMLDivElement) {
	const x = event.pageX - element.offsetLeft;
	const y = event.pageY - element.offsetTop;
	const middleX = element.clientWidth / 2;
	const middleY = element.clientHeight / 2;

	const offsetX = ((x - middleX) / middleX) * 25;
	const offsetY = ((y - middleY) / middleY) * 25;
	element.style.setProperty("--rotateX", `${offsetX}`);
	element.style.setProperty("--rotateY", `${-offsetY}`);
}
function resetCard(element: HTMLDivElement) {
	element.style.setProperty("--rotateX", "0");
	element.style.setProperty("--rotateY", "0");
}

function showContextMenu(event: MouseEvent, tweak: Tweak) {
	if (currentTweak === tweak) return hideContextMenu();
	event.preventDefault();
	currentTweak = tweak;

	contextMenu.style.left = `${event.pageX}px`;
	contextMenu.style.top = `${event.pageY}px`;
	contextMenu.hidden = false;

	document.addEventListener("click", hideContextMenu);
}

function hideContextMenu() {
	currentTweak = null;
	contextMenu.hidden = true;
	document.removeEventListener("click", hideContextMenu);
}

function copyTweakImport() {
	if (!currentTweak) return;

	const importStatement = `@import url("https://${window.location.host}/css/${currentTweak.id}.css");`;
	navigator.clipboard
		.writeText(importStatement)
		.then(() => clipboard.classList.add("copied-popup"))
		.catch(console.error);
}

function viewTweakCode() {
	if (!currentTweak) return;
	window.open(`/scss/${currentTweak.id}.scss`, "_blank");
}

function shareTweak() {
	if (!currentTweak) return;

	const shareUrl = `${window.location.origin}${window.location.pathname}?id=${currentTweak.id}`;

	// Try to use the Web Share API for mobile devices
	if (navigator.share) {
		navigator
			.share({
				title: currentTweak.name,
				text: currentTweak.desc,
				url: shareUrl,
			})
			.catch(error => {
				console.log("Error sharing:", error);
				// Fall back to clipboard if sharing fails
				copyShareUrl(shareUrl);
			});
		return;
	}

	// Fallback to clipboard for desktop
	copyShareUrl(shareUrl);
}

function copyShareUrl(url: string) {
	navigator.clipboard
		.writeText(url)
		.then(() => {
			clipboard.classList.add("copied-popup");
		})
		.catch(error => {
			console.error("Failed to copy share URL:", error);
			clipboard.classList.add("error");
		});
}

function createTweakCard(tweak: Tweak): HTMLElement {
	const cardWrapper = document.createElement("div");
	cardWrapper.className = "card-wrapper";
	const card = document.createElement("div");
	card.className = "card";
	card.innerHTML = `
		<div class="card-preview" style="background-image: url('/preview/${tweak.id}.webp')"></div>
		<h3 class="card-name">${tweak.name}</h3>
	`;
	cardWrapper.appendChild(card);

	cardWrapper.addEventListener("mouseenter", () => {
		showTweakPopup(card, tweak);
		if (cardWrapper.classList.contains("recommended")) {
			cardWrapper.classList.add("recommended-hover");
		}
	});

	cardWrapper.addEventListener("mousemove", event => rotateCard(event, cardWrapper));

	cardWrapper.addEventListener("mouseleave", () => {
		hideTweakPopup();
		cardWrapper.classList.remove("recommended-hover");
		resetCard(cardWrapper);
	});

	cardWrapper.addEventListener("click", () => {
		if (!cardWrapper.classList.contains("required")) {
			updateEnabled(tweak.id, cardWrapper, tweakElements);
		}
	});

	cardWrapper.addEventListener("contextmenu", event => {
		showContextMenu(event, tweak);
	});

	return cardWrapper;
}

async function importTweaks(input: string): Promise<void> {
	if (!input.trim()) return;

	const msg = importHashInput.placeholder;
	setTimeout(() => (importHashInput.placeholder = msg), 3000);

	// https://regex101.com/r/2b99Ea/1
	const importMatch = input.trim().match(/\b(?:(?=[a-z-]+-[a-z-]+)[a-z-]+|[A-Za-z0-9_-]{6})\b/g);
	if (!importMatch) {
		importHashInput.value = "";
		importHashInput.placeholder = i18n("Tweak ID not found!");
		return;
	}

	const hash = importMatch.at(-1);
	let importedTweaks: string[];

	if (tweaksData.find(t => t.id === hash)) {
		importedTweaks = [hash!];
	} else {
		const response = await fetch(`/tweaks/${hash}`);

		if (!response.ok) {
			importHashInput.value = "";
			importHashInput.placeholder = i18n("Failed to import!");
			return console.error(`Failed to import: ${response.statusText}`);
		}

		importedTweaks = await response.json();
	}

	enabledTweaks.length = 0;
	tweakElements.forEach((element, tweakId) => {
		const isEnabled = importedTweaks.includes(tweakId);
		updateEnabled(tweakId, element, tweakElements, isEnabled);
	});

	importHashInput.value = "";
	importHashInput.placeholder = i18n("Successfully imported!");
}

function onLoad() {
	tweaksGrid = document.getElementById("tweaks-grid") as HTMLDivElement;
	popup = document.getElementById("popup") as HTMLDivElement;
	contextMenu = document.getElementById("context-menu") as HTMLDivElement;
	clipboard = document.getElementById("clipboard") as HTMLDivElement;
	importHashInput = document.getElementById("import-hash") as HTMLInputElement;
	importButton = document.getElementById("import-button") as HTMLButtonElement;

	clipboard.addEventListener("click", () => saveClipboard(clipboard));

	contextMenu.querySelector(".copy-import")?.addEventListener("click", copyTweakImport);
	contextMenu.querySelector(".view-code")?.addEventListener("click", viewTweakCode);
	contextMenu.querySelector(".share-tweak")?.addEventListener("click", shareTweak);

	importButton.addEventListener("click", () => importTweaks(importHashInput.value));
	importHashInput.addEventListener("keydown", e => {
		if (e.key === "Enter") {
			importTweaks(importHashInput.value);
		}
	});

	// Close context menu on Escape key
	document.addEventListener("keydown", e => {
		if (e.key === "Escape" && !contextMenu.hidden) {
			hideContextMenu();
		}
	});

	fetch("/tweaks")
		.then(response => response.json())
		.then((tweaks: Tweak[]) => {
			setTweaksData(tweaks);

			buildDependencyMaps(tweaks);

			tweaks.forEach(tweak => {
				tweak.name = i18n(tweak.name);
				tweak.desc = i18n(tweak.desc);

				const card = createTweakCard(tweak);
				tweakElements.set(tweak.id, card);
				tweaksGrid.appendChild(card);
			});

			updateRecommendedVisuals(tweakElements);

			const urlParams = new URLSearchParams(window.location.search);
			const hash = urlParams.get("id");
			if (hash) {
				importTweaks(hash);
			}
		});
}

export default { onLoad };
