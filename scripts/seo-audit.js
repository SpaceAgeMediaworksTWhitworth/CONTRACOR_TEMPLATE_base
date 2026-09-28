// ─────────────────────────────────────────────────────────────────────────────
// ON-SITE SEO AUDIT (run after a build): npm run audit
// Checks every built page in public/ for the things that actually move local
// rankings: titles, descriptions, H1s, canonicals, schema, alt text, broken
// internal links, thin pages, near-duplicate town pages, and orphan pages.
// Writes seo-report.json and exits 1 if there are errors (so CI can block a deploy).
// ─────────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");

const PUBLIC = path.join(process.cwd(), "public");
const client = require("../src/_data/client");

if (!fs.existsSync(PUBLIC)) {
	console.error("No public/ folder. Run `npm run build` first.");
	process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const walk = (dir) =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
		const p = path.join(dir, d.name);
		if (d.isDirectory()) return d.name === "admin" || d.name === "assets" ? [] : walk(p);
		return d.name.endsWith(".html") ? [p] : [];
	});

const decode = (s) =>
	s
		.replace(/&amp;/g, "&")
		.replace(/&#39;|&#x27;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&nbsp;/g, " ");
const first = (html, re) => {
	const m = html.match(re);
	return m ? decode(m[1].trim()) : null;
};
// Parse attributes from a tag, quoted or not (the minifier drops quotes)
const attrs = (tag) => {
	const out = {};
	for (const m of tag.matchAll(/([\w:-]+)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
	return out;
};
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((m) => ({ raw: m[0], ...attrs(m[0]) }));
const metaContent = (html, name) => (tags(html, "meta").find((t) => t.name === name) || {}).content || null;

const textOf = (html) =>
	decode(
		html
			.replace(/<script[\s\S]*?<\/script>/gi, " ")
			.replace(/<style[\s\S]*?<\/style>/gi, " ")
			.replace(/<[^>]+>/g, " "),
	)
		.replace(/\s+/g, " ")
		.trim();
const words = (s) => (s ? s.split(/\s+/).filter(Boolean).length : 0);

// Word shingles for near-duplicate checks
const shingles = (text, n = 5) => {
	const w = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);
	const set = new Set();
	for (let i = 0; i <= w.length - n; i++) set.add(w.slice(i, i + n).join(" "));
	return set;
};
const jaccard = (a, b) => {
	let inter = 0;
	for (const x of a) if (b.has(x)) inter++;
	return inter / (a.size + b.size - inter || 1);
};

// ── Collect pages ───────────────────────────────────────────────────────────
const files = walk(PUBLIC);
const urlOf = (file) => {
	let rel = "/" + path.relative(PUBLIC, file).replace(/\\/g, "/");
	return rel.endsWith("/index.html") ? rel.slice(0, -10) : rel;
};

const pages = files.map((file) => {
	const html = fs.readFileSync(file, "utf8");
	const main = first(html, /<main[^>]*>([\s\S]*?)<\/main>/i) || "";
	// "Body" text = the article/prose part, where unique copy lives
	const prose = (html.match(/<article[^>]*class="?[^">]*cs-prose[^>]*>([\s\S]*?)<\/article>/i) || [])[1] || "";
	return {
		file,
		url: urlOf(file),
		html,
		title: first(html, /<title>([\s\S]*?)<\/title>/i),
		description: metaContent(html, "description"),
		canonical: (tags(html, "link").find((t) => t.rel === "canonical") || {}).href || null,
		robots: metaContent(html, "robots") || "",
		h1s: (html.match(/<h1[\s>]/gi) || []).length,
		schema: [...html.matchAll(/<script type="?application\/ld\+json"?>([\s\S]*?)<\/script>/gi)].map((m) => m[1]),
		imgsNoAlt: tags(html, "img").filter((t) => !/\balt\b/i.test(t.raw)).length,
		links: tags(html, "a")
			.map((t) => (t.href || "").split(/[#?]/)[0])
			.filter(Boolean),
		mainWords: words(textOf(main)),
		proseText: textOf(prose),
		type: /\/service-areas\/[^/]+\/$/.test(urlOf(file))
			? "area"
			: /\/services\/[^/]+\/$/.test(urlOf(file))
				? "service"
				: /\/blog\/[^/]+\/$/.test(urlOf(file))
					? "post"
					: "page",
	};
});

// Audit the site as if it were live. "noindex, follow" = this page is noindex on purpose
// (thank-you, 404). "noindex, nofollow" = the whole site is still in staging.
const indexable = (p) => !/noindex,\s*follow/i.test(p.robots) && !p.url.endsWith("404.html");
const issues = [];
const add = (level, url, msg) => issues.push({ level, url, msg });

// ── Per-page checks ─────────────────────────────────────────────────────────
const MIN_WORDS = { area: 250, service: 400, post: 600 };
for (const p of pages) {
	if (!p.title) add("error", p.url, "Missing <title>");
	else if (p.title.length > 65) add("warn", p.url, `Title is ${p.title.length} chars (aim for 65 or less): "${p.title}"`);
	else if (p.title.length < 25) add("warn", p.url, `Title is short (${p.title.length} chars): "${p.title}"`);

	if (!p.description) add("error", p.url, "Missing meta description");
	else if (p.description.length > 160) add("warn", p.url, `Description is ${p.description.length} chars (aim for 155 or less)`);
	else if (p.description.length < 70) add("warn", p.url, `Description is short (${p.description.length} chars)`);

	if (p.h1s !== 1 && indexable(p)) add("error", p.url, `Has ${p.h1s} <h1> tags (need exactly 1)`);
	if (!p.canonical) add("error", p.url, "Missing canonical link");
	else if (!p.canonical.startsWith(client.domain)) add("error", p.url, `Canonical doesn't use client.domain: ${p.canonical}`);

	if (!p.schema.length && indexable(p)) add("warn", p.url, "No JSON-LD schema");
	for (const s of p.schema) {
		try {
			JSON.parse(s);
		} catch (e) {
			add("error", p.url, `Schema JSON is invalid: ${e.message}`);
		}
	}
	if (p.imgsNoAlt) add("warn", p.url, `${p.imgsNoAlt} image(s) missing an alt attribute`);

	const min = MIN_WORDS[p.type];
	const proseWords = words(p.proseText);
	if (min && proseWords < min) add("warn", p.url, `Thin ${p.type} page: ${proseWords} words of unique copy (aim for ${min}+)`);
}

// ── Duplicates ──────────────────────────────────────────────────────────────
const dupes = (key) => {
	const seen = {};
	for (const p of pages.filter(indexable)) if (p[key]) (seen[p[key]] = seen[p[key]] || []).push(p.url);
	for (const [val, urls] of Object.entries(seen))
		if (urls.length > 1) add("error", urls.join(", "), `Duplicate ${key}: "${val}"`);
};
dupes("title");
dupes("description");

// Near-duplicate town/service copy (the #1 reason town pages don't rank)
for (const type of ["area", "service"]) {
	const group = pages.filter((p) => p.type === type).map((p) => ({ ...p, sh: shingles(p.proseText) }));
	for (let i = 0; i < group.length; i++)
		for (let j = i + 1; j < group.length; j++) {
			const sim = jaccard(group[i].sh, group[j].sh);
			if (sim > 0.35)
				add("warn", `${group[i].url} + ${group[j].url}`, `${type} pages are ${Math.round(sim * 100)}% the same. Rewrite one.`);
		}
}

// ── Links: broken + orphans ─────────────────────────────────────────────────
const known = new Set(pages.map((p) => p.url));
const linkedTo = new Set();
for (const p of pages) {
	for (const href of p.links) {
		if (!href.startsWith("/") || href.startsWith("//")) continue;
		if (href.startsWith("/assets/") || href.startsWith("/admin")) continue;
		const target = href.endsWith("/") || href.endsWith(".html") ? href : href + "/";
		if (known.has(target)) linkedTo.add(target);
		else add("error", p.url, `Broken internal link: ${href}`);
	}
}
for (const p of pages.filter(indexable)) {
	if (p.url !== "/" && !linkedTo.has(p.url)) add("warn", p.url, "Orphan page: nothing links to it");
}

// ── Sitemap + robots ────────────────────────────────────────────────────────
const sitemapPath = path.join(PUBLIC, "sitemap.xml");
if (fs.existsSync(sitemapPath)) {
	const sm = fs.readFileSync(sitemapPath, "utf8");
	for (const p of pages.filter(indexable))
		if (!sm.includes(`${client.domain}${p.url}<`)) add("warn", p.url, "Not in sitemap.xml");
	for (const p of pages.filter((p) => !indexable(p)))
		if (sm.includes(`${client.domain}${p.url}<`) && client.indexable) add("warn", p.url, "noindex page is in sitemap.xml");
} else add("error", "/sitemap.xml", "Missing sitemap.xml");

// Brand colors vs white text (buttons, bars). WCAG AA = 4.5:1
const lum = (hex) => {
	const c = hex.replace("#", "").match(/.{2}/g).map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
	return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
for (const key of ["primary", "secondary"]) {
	const hex = client.brand && client.brand[key];
	if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) continue;
	const ratio = 1.05 / (lum(hex) + 0.05);
	if (ratio < 4.5) add("warn", "(site)", `brand.${key} ${hex} is only ${ratio.toFixed(1)}:1 against white text. Darken it to pass 4.5:1.`);
}

if (!client.indexable) add("info", "(site)", "client.indexable is false: every page is noindex. Flip it at launch.");
if (!client.tracking.gtmId && !client.tracking.ga4Id) add("info", "(site)", "No GTM or GA4 ID in client.js");
if (!client.tracking.gscVerification) add("info", "(site)", "No Search Console verification tag (fine if verified by DNS)");
if (!client.reviews.count) add("info", "(site)", "No review count in client.js. Add real Google numbers for trust + schema.");
if (!client.google.businessProfileUrl) add("info", "(site)", "No Google Business Profile URL. Add it (it's linked in schema sameAs).");

// ── Report ──────────────────────────────────────────────────────────────────
const count = (lvl) => issues.filter((i) => i.level === lvl).length;
const summary = {
	date: new Date().toISOString(),
	site: client.name,
	domain: client.domain,
	pages: pages.length,
	indexable: pages.filter(indexable).length,
	byType: pages.reduce((a, p) => ((a[p.type] = (a[p.type] || 0) + 1), a), {}),
	errors: count("error"),
	warnings: count("warn"),
	info: count("info"),
};
fs.writeFileSync(path.join(process.cwd(), "seo-report.json"), JSON.stringify({ summary, issues }, null, 2));

const icon = { error: "✖", warn: "▲", info: "·" };
for (const lvl of ["error", "warn", "info"])
	for (const i of issues.filter((x) => x.level === lvl)) console.log(`${icon[lvl]} ${i.url}  ${i.msg}`);
console.log(
	`\n${summary.pages} pages (${Object.entries(summary.byType)
		.map(([k, v]) => `${v} ${k}`)
		.join(", ")}). ${summary.errors} errors, ${summary.warnings} warnings. Full report: seo-report.json`,
);
process.exit(summary.errors ? 1 : 0);
