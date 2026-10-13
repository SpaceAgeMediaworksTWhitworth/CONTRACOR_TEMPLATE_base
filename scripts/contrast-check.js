// ─────────────────────────────────────────────────────────────────────────────
// CONTRAST GATE (run after a build): npm run contrast
//
// Serves public/ locally, opens every built page in Chrome (puppeteer-core) in
// light AND dark (prefers-color-scheme), at 375px and 1280px, injects axe-core
// and runs only the "color-contrast" rule. Any violation = FAIL (exit 1).
//
// Chrome: uses CHROME_PATH if set, else the normal install location.
// Options: CONTRAST_PAGES="/,/about/" to check only some pages.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
const http = require("http");
const puppeteer = require("puppeteer-core");

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const MODES = ["light", "dark"];
const WIDTHS = [375, 1280];
const SKIP = [/^\/admin\//];

if (!fs.existsSync(PUBLIC)) {
	console.error("No public/ folder. Run `npm run build` first.");
	process.exit(1);
}

const chromePath = [
	process.env.CHROME_PATH,
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/Applications/Chromium.app/Contents/MacOS/Chromium",
	"/usr/bin/google-chrome",
	"/usr/bin/google-chrome-stable",
	"/usr/bin/chromium",
	"/usr/bin/chromium-browser",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => p && fs.existsSync(p));
if (!chromePath) {
	console.error("Chrome not found. Install Google Chrome or set CHROME_PATH.");
	process.exit(1);
}

// ── Pages ──────────────────────────────────────────────────────────────────
const walk = (dir) =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
		const full = path.join(dir, d.name);
		return d.isDirectory() ? walk(full) : d.name.endsWith(".html") ? [full] : [];
	});
let urls = walk(PUBLIC)
	.map((f) => "/" + path.relative(PUBLIC, f).split(path.sep).join("/"))
	.map((u) => u.replace(/index\.html$/, ""))
	.filter((u) => !SKIP.some((r) => r.test(u)))
	.sort();
if (process.env.CONTRAST_PAGES) urls = process.env.CONTRAST_PAGES.split(",").map((s) => s.trim());

// ── Static server ──────────────────────────────────────────────────────────
const TYPES = {
	".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
	".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
	".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".ico": "image/x-icon",
	".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".txt": "text/plain", ".xml": "application/xml",
};
const server = http.createServer((req, res) => {
	let p = decodeURIComponent(req.url.split("?")[0]);
	let file = path.join(PUBLIC, p);
	if (!file.startsWith(PUBLIC)) return res.writeHead(403).end();
	if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
	if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
	if (!fs.existsSync(file)) return res.writeHead(404).end("Not found");
	res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
	fs.createReadStream(file).pipe(res);
});

// ── Run ────────────────────────────────────────────────────────────────────
(async () => {
	await new Promise((r) => server.listen(0, "127.0.0.1", r));
	const base = `http://127.0.0.1:${server.address().port}`;
	const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, args: ["--no-sandbox"] });
	const jobs = [];
	for (const url of urls) for (const mode of MODES) for (const width of WIDTHS) jobs.push({ url, mode, width });

	const fails = [];
	const run = async ({ url, mode, width }) => {
		const page = await browser.newPage();
		try {
			await page.setViewport({ width, height: 900 });
			await page.emulateMediaFeatures([
				{ name: "prefers-color-scheme", value: mode },
				{ name: "prefers-reduced-motion", value: "reduce" },
			]);
			await page.goto(base + url, { waitUntil: "networkidle0", timeout: 30000 });
			// Finish any fade-in / transition so axe sees final colors.
			await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
			await page.evaluate(AXE);
			const result = await page.evaluate(async () =>
				window.axe.run(document, { runOnly: { type: "rule", values: ["color-contrast"] }, resultTypes: ["violations"] }),
			);
			for (const v of result.violations)
				for (const n of v.nodes) {
					const d = (n.any[0] && n.any[0].data) || {};
					fails.push({
						url, mode, width,
						target: n.target.join(" "),
						text: (n.html || "").replace(/\s+/g, " ").slice(0, 90),
						fg: d.fgColor, bg: d.bgColor, ratio: d.contrastRatio, need: d.expectedContrastRatio,
					});
				}
		} catch (e) {
			fails.push({ url, mode, width, target: "(page)", text: `Could not check: ${e.message}` });
		} finally {
			await page.close();
		}
	};

	const CONCURRENCY = 4;
	let i = 0;
	await Promise.all(
		Array.from({ length: CONCURRENCY }, async () => {
			while (i < jobs.length) await run(jobs[i++]);
		}),
	);
	await browser.close();
	server.close();

	// Group the same element across mode/width so the report stays short.
	const groups = new Map();
	for (const f of fails) {
		const k = `${f.url}|${f.target}|${f.fg}|${f.bg}`;
		if (!groups.has(k)) groups.set(k, { ...f, where: [] });
		groups.get(k).where.push(`${f.mode}@${f.width}`);
	}
	for (const g of groups.values()) {
		const colors = g.fg ? ` ${g.fg} on ${g.bg} = ${g.ratio}:1 (need ${g.need})` : "";
		console.log(`✗ FAIL [contrast] ${g.url}  ${g.target}${colors}  [${g.where.join(", ")}]\n    ${g.text}`);
	}
	console.log(
		`\n${urls.length} pages x ${MODES.length} modes x ${WIDTHS.length} widths = ${jobs.length} checks. ` +
			`${fails.length} contrast failure(s) on ${groups.size} element(s).`,
	);
	process.exit(fails.length ? 1 : 0);
})().catch((e) => {
	console.error(e);
	server.close();
	process.exit(1);
});
