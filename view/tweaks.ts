export interface Tweak {
	id: string;
	name: string;
	desc: string;
	animatedPreview?: boolean;
	requires?: string[];
	recommends?: string[];
}

export let enabledTweaks: string[] = [];
export let tweaksData: Tweak[] = [];
export let requiredByMap: Map<string, string[]> = new Map();
export let recommendedByMap: Map<string, string[]> = new Map();
export let previousStateMap: Map<string, boolean> = new Map();

export function setTweaksData(data: Tweak[]): void {
	tweaksData = data;
}

export function updateCardState(
	card: HTMLElement,
	tweakId: string,
	isEnabled: boolean,
	isRequired: boolean = false,
): void {
	card.classList.toggle("enabled", isEnabled);
	card.classList.toggle("required", isRequired);

	const index = enabledTweaks.indexOf(tweakId);
	if (isEnabled && index === -1) {
		enabledTweaks.push(tweakId);
	} else if (!isEnabled && index !== -1) {
		enabledTweaks.splice(index, 1);
	}

	if (!isRequired) {
		previousStateMap.set(tweakId, isEnabled);
	}
}

export function updateEnabled(
	tweakId: string,
	card: HTMLElement,
	tweakElements: Map<string, HTMLElement>,
	force?: boolean,
): void {
	const index = enabledTweaks.indexOf(tweakId);
	const tweak = tweaksData.find(t => t.id === tweakId);
	const isCurrentlyEnabled = index !== -1;

	const requiredBy = requiredByMap.get(tweakId) || [];
	const isRequired = requiredBy.some(requiringId => enabledTweaks.includes(requiringId));

	if (!previousStateMap.has(tweakId)) {
		previousStateMap.set(tweakId, isCurrentlyEnabled);
	}

	if (isRequired) {
		updateCardState(card, tweakId, true, true);
		return;
	}

	if (card.classList.contains("required")) {
		const wasEnabled = previousStateMap.get(tweakId) || false;
		updateCardState(card, tweakId, wasEnabled, false);
		return;
	}

	const newEnabledState = force !== undefined ? force : !isCurrentlyEnabled;
	updateCardState(card, tweakId, newEnabledState);

	if (newEnabledState) {
		if (tweak?.requires) {
			tweak.requires.forEach(requiredId => {
				const requiredCard = tweakElements.get(requiredId);
				if (requiredCard) {
					if (!previousStateMap.has(requiredId)) {
						previousStateMap.set(requiredId, enabledTweaks.includes(requiredId));
					}

					updateCardState(requiredCard, requiredId, true, true);
				}
			});
		}
	} else {
		if (tweak?.requires) {
			tweak.requires.forEach(requiredId => {
				const requiredCard = tweakElements.get(requiredId);
				if (requiredCard) {
					const stillRequired = Array.from(requiredByMap.get(requiredId) || [])
						.filter(id => id !== tweakId)
						.some(id => enabledTweaks.includes(id));

					if (!stillRequired && requiredCard.classList.contains("required")) {
						const wasEnabled = previousStateMap.get(requiredId) || false;
						updateCardState(requiredCard, requiredId, wasEnabled, false);
					}
				}
			});
		}
	}

	updateRecommendedVisuals(tweakElements);
}

export function updateRecommendedVisuals(tweakElements: Map<string, HTMLElement>): void {
	tweakElements.forEach((card, tweakId) => {
		const recommendedBy = recommendedByMap.get(tweakId) || [];
		const isRecommended = recommendedBy.some(id => enabledTweaks.includes(id));
		card.classList.toggle("recommended", isRecommended);
	});
}

export function buildDependencyMaps(tweaks: Tweak[]): void {
	tweaks.forEach(tweak => {
		if (tweak.requires) {
			tweak.requires.forEach(requiredId => {
				if (!requiredByMap.has(requiredId)) {
					requiredByMap.set(requiredId, []);
				}
				requiredByMap.get(requiredId)?.push(tweak.id);
			});
		}

		if (tweak.recommends) {
			tweak.recommends.forEach(recommendedId => {
				if (!recommendedByMap.has(recommendedId)) {
					recommendedByMap.set(recommendedId, []);
				}
				recommendedByMap.get(recommendedId)?.push(tweak.id);
			});
		}
	});
}

export async function saveClipboard(element: HTMLElement): Promise<void> {
	try {
		const response = await fetch("/css", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ tweaks: enabledTweaks }),
		});

		if (!response.ok) {
			throw new Error("Failed to generate CSS");
		}

		const { hash } = await response.json();
		const importStatement = `@import url(https://${window.location.host}/css/${hash}.css);`;
		await navigator.clipboard.writeText(importStatement);

		element.classList.add("copied-popup");
	} catch (error) {
		console.error("Failed to save to clipboard:", error);
		element.classList.add("error");
	}
}
