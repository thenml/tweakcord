const fs = require("fs");
const path = require("path");
const glob = require("glob");

const srcPath = path.resolve(__dirname, "../view/index.html");
const i18nPath = path.resolve(__dirname, "../public/i18n");
const destPath = path.resolve(__dirname, "../view/dist");
const assetsPath = path.resolve(__dirname, "../public/assets");

// {{text|id}}
function translateHTML(html, translations) {
	return html.replace(/{{(.*?)}}/g, (_, rawKey) => {
		const [text, id] = rawKey.split("|").map(s => s.trim());
		const key = id || text;
		if (!translations) return text;

		const translation = translations[key];
		if (!translation) {
			console.warn(`Missing translation for "${key}"`);
			return text;
		}
		return translation;
	});
}

// {{@name.svg}}
function templateSVG(html) {
	return html.replace(/{{@(.*?\.svg)}}/g, (_, rawName) => {
		const name = rawName.trim();
		const file = path.join(assetsPath, name);
		if (!fs.existsSync(file)) {
			console.warn(`Missing asset "${name}"`);
			return "";
		}

		return fs.readFileSync(file, "utf8");
	});
}

function build() {
	fs.mkdirSync(destPath, { recursive: true });
	const baseHTML = fs.readFileSync(srcPath, "utf8").replace(/\.scss/g, ".css");

	const languages = glob.sync(`${i18nPath}/*.json`);
	for (const langPath of [...languages, "en"]) {
		const langCode = path.basename(langPath, ".json");
		const translations = langCode === "en" ? "" : JSON.parse(fs.readFileSync(langPath, "utf8"));

		console.log(`i18n [${langCode}]`);
		const distHTML = transformHTML(baseHTML, translations);

		const outputFile = path.join(destPath, `index${langCode === "en" ? "" : "-" + langCode}.html`);
		fs.writeFileSync(outputFile, distHTML);
	}
}

function transformHTML(html, translations) {
	return translateHTML(templateSVG(html), translations);
}

build();
