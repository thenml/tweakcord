function benchSelector(selector) {
	const baselineFast = 80; // ms, reference for "very fast" selector
	const label = `10k iterations of ${selector}`;
	const start = performance.now();
	for (let i = 0; i < 10000; i++) document.querySelectorAll(selector);
	const end = performance.now();
	const duration = (end - start) / 10;
	const matchCount = document.querySelectorAll(selector).length;
	const speedPercent = ((baselineFast / duration) * 100).toFixed(2);

	let rating;
	if (duration < 200) rating = "Fast ✅";
	else if (duration < 500) rating = "Acceptable ⚠️";
	else if (duration < 1200) rating = "Slow ❌";
	else rating = "Very Slow 🐌❌";

	console.log(`${label}: ${duration.toFixed(4)} ms avg`);
	console.log(`${matchCount} matches`);
	console.log(`Speed: ${speedPercent}% of optimal — ${rating}`);
}

function benchmarkCSS(cssString) {
	function extractSelectors(css) {
		css = css.replace(/\/\*[\s\S]*?\*\//g, "");

		const selectors = [];
		let buffer = "";
		let inSelector = true;
		let bracketDepth = 0;

		for (let i = 0; i < css.length; i++) {
			const char = css[i];

			if (char === "{") {
				if (inSelector) {
					selectors.push(buffer.trim());
					buffer = "";
				}
				inSelector = false;
				bracketDepth++;
			} else if (char === "}") {
				bracketDepth--;
				if (bracketDepth === 0) inSelector = true;
			} else if (inSelector) buffer += char;
		}

		return selectors
			.flatMap(sel => sel.split(/,(?![^(]*\))/)) // split compound selectors
			.map(s => s.trim().replace(/::(?:before|after)/g, "")) // remove pseudo-elements
			.filter(Boolean);
	}

	function benchmark(selector) {
		const start = performance.now();
		let matchCount = 0;
		for (let i = 0; i < 10000; i++) matchCount = document.querySelectorAll(selector).length;

		const time = (performance.now() - start) / 10000;
		return { selector, time, matches: matchCount };
	}

	const results = extractSelectors(cssString)
		.map(selector => {
			try {
				return benchmark(selector);
			} catch (err) {
				console.warn(`Skipping invalid selector "${selector}": ${err.message}`);
				return null;
			}
		})
		.filter(Boolean)
		.sort((a, b) => b.time - a.time);

	const csvHeader = "Selector,Time (ms),Matches";
	const csvRows = results.map(r => `"${r.selector}",${r.time.toFixed(4)},${r.matches}`);
	return [csvHeader, ...csvRows].join("\n");
}
