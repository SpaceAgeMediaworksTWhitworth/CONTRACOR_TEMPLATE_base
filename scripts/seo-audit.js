// ─────────────────────────────────────────────────────────────────────────────
// ON-SITE SEO AUDIT (run after a build): npm run audit
//
// Enforces the build-time rules (B26-B46) from the 2026-10 research report
// "Local contractor site SEO pitfalls". Main job: every search phrase has ONE
// page that owns it (no cannibalization), town pages aren't doorway pages, and
// the basics (titles, H1s, canonicals, schema, links) are clean.
// GEO checks: AI crawlers named in robots.txt, /llms.txt built, posts open with an answer block.
//
// Reads page targets from the source files (src/content/**) and checks the
// built HTML in public/. Writes seo-report.json. Exits 1 on any FAIL.
// Thresholds marked [P] are proposed defaults from the report. Tune with data.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const client = require(path.join(ROOT, "src/_data/client"));
const fillTokens = require(path.join(ROOT, "src/config/utils/fillTokens"));
const { norm, isHomeCity } = require(path.join(ROOT, "src/config/utils/seo"));

if (!fs.existsSync(PUBLIC)) {
	console.error("No public/ folder. Run `npm run build` first.");
	process.exit(1);
}

const packFile = path.join(ROOT, "industries", client.industry, "pack.json");
const pack = fs.existsSync(packFile) ? JSON.parse(fillTokens(fs.readFileSync(packFile, "utf8"), client)) : {};
const tradeTerms = (pack.tradeTerms || [pack.titleNoun || pack.label || ""]).map(norm).filter(Boolean);
const homeCity = norm(client.address.city);
const DEMO = !!client.demo;

// ── Thresholds ──────────────────────────────────────────────────────────────
const T = {
	titleFailMax: 65, titleWarnMax: 60, titleWarnMin: 30, titleFailMin: 20, // [E] Zyppy 51-60 sweet spot; cutoffs [P]
	descWarnMax: 160, descWarnMin: 70,
	titleSimilarWarn: 0.8, // [P]
	townSimilarWarn: 0.6, townSimilarFail: 0.8, // [P] (84-85% overlap still ranked pre-2024, [E])
	serviceSimilarWarn: 0.6, // [P]
	maxTowns: 20, // [G] GBP service-area limit
	minTownProof: 2, // [P]
	minTownServiceLinks: 3, // [P]
	maxClickDepth: 3, // [P]
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const STOP = new Set(["a", "an", "and", "the", "in", "of", "for", "to", "near", "me", "my", "your", "with", "on", "at", "by", "is", "do", "i", "how", "what"]);
const STATES = new Set(["al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in","ia","ks","ky","la","me","md","ma","mi","mn","ms","mo","mt","ne","nv","nh","nj","nm","ny","nc","nd","oh","ok","or","pa","ri","sc","sd","tn","tx","ut","vt","va","wa","wv","wi","wy"]);
const brandTokens = new Set(norm(`${client.name} ${client.shortName || ""}`).split(" "));
const keyTokens = (s) => norm(s).split(" ").filter((w) => w && !STOP.has(w) && !STATES.has(w));
const normKeyword = (s) => keyTokens(s).join(" ");
const jaccardSets = (a, b) => {
	let inter = 0;
	for (const x of a) if (b.has(x)) inter++;
	return inter / (a.size + b.size - inter || 1);
};
const has = (text, phrase) => ` ${norm(text)} `.includes(` ${norm(phrase)} `);

const walk = (dir) =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
		const p = path.join(dir, d.name);
		if (d.isDirectory()) return d.name === "admin" || d.name === "assets" ? [] : walk(p);
		return d.name.endsWith(".html") ? [p] : [];
	});
const decode = (s) =>
	String(s)
		.replace(/&amp;/g, "&")
		.replace(/&#39;|&#x27;|&apos;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&nbsp;/g, " ");
const stripTags = (html) =>
	decode(String(html).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
		.replace(/\s+/g, " ")
		.trim();
// Attributes from a tag, quoted or not (the minifier drops quotes)
const attrs = (tag) => {
	const out = {};
	for (const m of tag.matchAll(/([\w:-]+)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
	return out;
};
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((m) => ({ raw: m[0], ...attrs(m[0]) }));
const metaContent = (html, name) => (tags(html, "meta").find((t) => t.name === name) || {}).content || null;
const shingles = (text, n = 5) => {
	const w = norm(text).split(" ");
	const set = new Set();
	for (let i = 0; i <= w.length - n; i++) set.add(w.slice(i, i + n).join(" "));
	return set;
};

// ── Source front matter (page targets) ─────────────────────────────────────
const readDir = (rel) => {
	const dir = path.join(ROOT, rel);
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith(".md"))
		.map((f) => ({ slug: path.basename(f, ".md"), file: path.join(rel, f), ...matter(fs.readFileSync(path.join(dir, f), "utf8")) }));
};
const srcServices = readDir("src/content/services").filter(
	(s) => !client.services.length || client.services.includes(s.slug),
);
const srcAreas = readDir("src/content/areas");
const srcPosts = readDir("src/content/blog").filter((p) => !p.data.draft);
const liveTowns = srcAreas.filter((a) => !isHomeCity(a.data.town, a.data.state, client));
const townNames = srcAreas.map((a) => a.data.town).filter(Boolean);

// URL -> { intent, keyword, src }
const targets = {};
targets["/"] = { intent: "home", keyword: `${tradeTerms[0] || ""} ${client.address.city}` };
for (const s of srcServices) targets[`/services/${s.slug}/`] = { intent: "service", keyword: s.data.keyword || s.data.name, src: s };
for (const a of liveTowns)
	targets[`/service-areas/${a.slug}/`] = { intent: "town", keyword: a.data.keyword || `${tradeTerms[0] || ""} ${a.data.town}`, src: a };
for (const p of srcPosts) targets[`/blog/${p.data.url || p.slug}/`] = { intent: "informational", keyword: p.data.keyword, src: p };

// ── Built pages ─────────────────────────────────────────────────────────────
const urlOf = (file) => {
	const rel = "/" + path.relative(PUBLIC, file).replace(/\\/g, "/");
	return rel.endsWith("/index.html") ? rel.slice(0, -10) : rel;
};
const pages = walk(PUBLIC).map((file) => {
	const html = fs.readFileSync(file, "utf8");
	const url = urlOf(file);
	const prose = (html.match(/<article[^>]*class="?[^">]*cs-prose[^>]*>([\s\S]*?)<\/article>/i) || [])[1] || "";
	const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({
		href: (attrs(m[1]).href || "").split(/[#?]/)[0],
		text: stripTags(m[2]),
		raw: m[1],
	}));
	const mainHtml = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) || [])[1] || "";
	const mainHrefs = [...mainHtml.matchAll(/<a\b([^>]*)>/gi)].map((m) => (attrs(m[1]).href || "").split(/[#?]/)[0]);
	const t = targets[url] || {};
	return {
		mainHrefs, // links in the page body only (not header/footer)
		file,
		url,
		html,
		intent: t.intent || "nav",
		keyword: t.keyword,
		src: t.src,
		titles: [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)].map((m) => decode(m[1].trim())),
		h1s: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1])),
		description: metaContent(html, "description"),
		canonical: (tags(html, "link").find((x) => x.rel === "canonical") || {}).href || null,
		robots: metaContent(html, "robots") || "",
		schema: [...html.matchAll(/<script type="?application\/ld\+json"?>([\s\S]*?)<\/script>/gi)].map((m) => m[1]),
		imgs: tags(html, "img"),
		anchors,
		proseText: stripTags(prose),
		faqItems: (html.match(/class="?cs-faq-item/g) || []).length,
	};
});
for (const p of pages) p.title = p.titles[0] || null;

// "noindex, follow" = intentionally noindex (thank-you, 404). "noindex, nofollow" = whole site in staging.
const indexable = (p) => !/noindex,\s*follow/i.test(p.robots) && !p.url.endsWith("404.html");
const live = pages.filter(indexable);
const byUrl = Object.fromEntries(pages.map((p) => [p.url, p]));

const issues = [];
const add = (level, rule, url, msg) => {
	if (!issues.some((i) => i.rule === rule && i.url === url && i.msg === msg)) issues.push({ level, rule, url, msg });
};
const proofLevel = DEMO ? "warn" : "fail";

// ── B26-B27: one target keyword per page, no two pages share one ────────────
for (const p of live) {
	if (["home", "service", "town", "informational"].includes(p.intent) && !p.keyword)
		add("fail", "B26", p.url, `No target keyword. Add "keyword:" to ${p.src ? p.src.file : "the page"}.`);
}
const kwSeen = {};
for (const p of live.filter((p) => p.keyword)) {
	const k = normKeyword(p.keyword);
	(kwSeen[k] = kwSeen[k] || []).push(p.url);
}
for (const [k, urls] of Object.entries(kwSeen))
	if (urls.length > 1) add("fail", "B27", urls.join(" + "), `Pages share the target "${k}". One page per search phrase: merge or re-aim one.`);

// ── B28-B29: titles, H1s, descriptions ──────────────────────────────────────
for (const p of pages) {
	if (p.titles.length !== 1) add("fail", "B29", p.url, `Has ${p.titles.length} <title> tags (need 1)`);
	const t = p.title || "";
	if (t.length > T.titleFailMax || (t && t.length < T.titleFailMin)) add("fail", "B29", p.url, `Title is ${t.length} chars (keep ${T.titleFailMin}-${T.titleFailMax}): "${t}"`);
	else if (t.length > T.titleWarnMax || (t.length < T.titleWarnMin && p.intent !== "nav")) add("warn", "B29", p.url, `Title is ${t.length} chars (51-60 gets rewritten least): "${t}"`);
	if (!p.description) add("fail", "B28", p.url, "Missing meta description");
	else if (p.description.length > T.descWarnMax || p.description.length < T.descWarnMin)
		add("warn", "B28", p.url, `Description is ${p.description.length} chars (aim for ${T.descWarnMin}-155)`);
	if (!indexable(p)) continue;
	if (p.h1s.length !== 1) add("fail", "B29", p.url, `Has ${p.h1s.length} <h1> tags (need exactly 1)`);
	if (p.keyword && p.h1s[0]) {
		const kt = keyTokens(p.keyword);
		const ht = new Set(keyTokens(p.h1s[0]));
		const hit = kt.filter((w) => ht.has(w)).length;
		if (kt.length && hit / kt.length < 0.5) add("warn", "B29", p.url, `H1 "${p.h1s[0]}" doesn't carry the target "${p.keyword}"`);
	}
}
const dupes = (label, get) => {
	const seen = {};
	for (const p of live) {
		const v = get(p);
		if (v) (seen[norm(v)] = seen[norm(v)] || []).push(p.url);
	}
	for (const [v, urls] of Object.entries(seen)) if (urls.length > 1) add("fail", "B28", urls.join(" + "), `Duplicate ${label}: "${v}"`);
};
dupes("title", (p) => p.title);
dupes("H1", (p) => p.h1s[0]);
dupes("description", (p) => p.description);
const titleTokens = (t) => new Set(keyTokens(t).filter((w) => !brandTokens.has(w)));
for (let i = 0; i < live.length; i++)
	for (let j = i + 1; j < live.length; j++) {
		const a = titleTokens(live[i].title || ""),
			b = titleTokens(live[j].title || "");
		if (a.size >= 2 && b.size >= 2 && jaccardSets(a, b) >= T.titleSimilarWarn)
			add("warn", "B28", `${live[i].url} + ${live[j].url}`, `Titles are ${Math.round(jaccardSets(a, b) * 100)}% the same`);
	}

// ── B30-B32: who owns which phrase ─────────────────────────────────────────
for (const p of live.filter((p) => p.url !== "/")) {
	for (const field of [p.title, p.h1s[0]].filter(Boolean)) {
		const term = tradeTerms.find((tt) => has(field, tt));
		if (term && has(field, client.address.city))
			add("fail", "B30", p.url, `"${field}" pairs "${term}" with the home city. Only the home page may target that.`);
	}
}
const homeCityFiles = srcAreas.filter((a) => isHomeCity(a.data.town, a.data.state, client));
const redirectsTxt = fs.existsSync(path.join(PUBLIC, "_redirects")) ? fs.readFileSync(path.join(PUBLIC, "_redirects"), "utf8") : "";
for (const a of homeCityFiles) {
	const from = `/service-areas/${a.slug}/`;
	if (byUrl[from]) add("fail", "B31", from, "Home-city town page is live. The home page owns the home city.");
	if (!redirectsTxt.includes(`${from} `)) add("fail", "B31", from, "Home-city town page has no 301 to /");
}
const serviceKeys = srcServices.map((s) => ({ slug: s.slug, phrases: [s.data.name, s.data.keyword].filter(Boolean) }));
const commercial = ["near me", "hire", "company", "companies", "contractor", "contractors", "best", ...tradeTerms];
for (const p of live.filter((p) => p.intent === "informational")) {
	const fields = [p.title, p.h1s[0], p.keyword].filter(Boolean);
	for (const f of fields) {
		const svc = serviceKeys.find((s) => s.phrases.some((ph) => has(f, ph)));
		const town = townNames.find((tn) => has(f, tn)) || (has(f, client.address.city) ? client.address.city : null);
		if (svc && town) add("fail", "B32", p.url, `"${f}" targets a service + town ("${town}"). That belongs to the service page, not a post.`);
		const word = commercial.find((c) => has(f, c));
		if (word && f === p.keyword) add("fail", "B32", p.url, `Post keyword "${f}" has a hiring word ("${word}"). Posts answer questions; service pages sell.`);
	}
	if (p.keyword) {
		const clash = serviceKeys.find((s) => s.phrases.some((ph) => normKeyword(ph) === normKeyword(p.keyword)));
		if (clash) add("fail", "B32", p.url, `Post keyword "${p.keyword}" is the service page's target (/services/${clash.slug}/). Put it on that page instead.`);
	}
	if (p.src && !p.src.data.input) add(proofLevel, "A22", p.url, "Post has no real input (job, owner quote, customer question, local fact). No input = no post.");
}

// ── B33-B35: town pages (doorway / scaled-content guardrails) ───────────────
if (liveTowns.length > T.maxTowns) add("fail", "B33", "/service-areas/", `${liveTowns.length} town pages (max ${T.maxTowns}, the GBP service-area limit)`);
for (const a of liveTowns) {
	const url = `/service-areas/${a.slug}/`;
	const d = a.data;
	if (!d.gbpListed) add("fail", "B33", url, "Town isn't on the GBP service area list (set gbpListed: true once it is)");
	const jobs = (d.jobs || []).filter((j) => j.source);
	const facts = (d.localFacts || []).filter((f) => f.source);
	const reviews = (client.reviews.featured || []).filter((r) => norm(r.town) === norm(d.town));
	const named = (d.neighborhoods || []).length || (d.landmarks || []).length ? 1 : 0;
	const proof = jobs.length + facts.length + reviews.length + named;
	if (proof < T.minTownProof)
		add(proofLevel, "B34", url, `Only ${proof} piece(s) of real local proof (need ${T.minTownProof}+: a job here, a review naming ${d.town}, a sourced local fact, named neighborhoods)`);
	for (const j of d.jobs || []) if (!j.source) add("fail", "B34", url, `Job "${j.title}" has no source`);
	for (const f of d.localFacts || []) if (!f.source) add("fail", "B34", url, `Local fact has no source: "${f.text}"`);
}
const simCheck = (type, warn, fail) => {
	const group = live.filter((p) => p.intent === type).map((p) => ({ url: p.url, sh: shingles(p.proseText) }));
	for (let i = 0; i < group.length; i++)
		for (let j = i + 1; j < group.length; j++) {
			const sim = jaccardSets(group[i].sh, group[j].sh);
			const lvl = fail && sim >= fail ? "fail" : sim >= warn ? "warn" : null;
			if (lvl) add(lvl, type === "town" ? "B35" : "B36", `${group[i].url} + ${group[j].url}`, `${type} page copy is ${Math.round(sim * 100)}% the same. Rewrite one.`);
		}
};
simCheck("town", T.townSimilarWarn, T.townSimilarFail);
simCheck("service", T.serviceSimilarWarn, null);

// ── B37-B40, B42-B43: links ────────────────────────────────────────────────
const known = new Set(pages.map((p) => p.url));
const redirectFrom = new Set([...redirectsTxt.matchAll(/^(\/\S*)\s+\S+/gm)].map((m) => m[1]));
const inbound = {};
const graph = {};
for (const p of pages) {
	graph[p.url] = new Set();
	for (const a of p.anchors) {
		const h = a.href;
		if (!h.startsWith("/") || h.startsWith("//") || h.startsWith("/assets/") || h.startsWith("/admin")) continue;
		if (redirectFrom.has(h)) add("fail", "B42", p.url, `Links to a redirected URL: ${h}`);
		if (h !== h.toLowerCase() || /[_ ]/.test(h) || (!h.endsWith("/") && !/\.\w+$/.test(h))) add("warn", "B43", p.url, `Odd internal URL style: ${h}`);
		const target = h.endsWith("/") || /\.\w+$/.test(h) ? h : h + "/";
		if (!known.has(target)) {
			add("fail", "B37", p.url, `Broken internal link: ${h}`);
			continue;
		}
		if (target !== p.url) (inbound[target] = inbound[target] || new Set()).add(p.url);
		graph[p.url].add(target);
	}
}
// Click depth from the home page
const depth = { "/": 0 };
const queue = ["/"];
while (queue.length) {
	const u = queue.shift();
	for (const v of graph[u] || []) if (depth[v] === undefined) (depth[v] = depth[u] + 1), queue.push(v);
}
for (const p of live) {
	if (p.url === "/") continue;
	if (!inbound[p.url] && ["service", "town", "informational"].includes(p.intent)) add("fail", "B37", p.url, "Orphan: no internal links point here");
	else if (depth[p.url] === undefined) add("warn", "B37", p.url, "Can't be reached by clicking from the home page");
	else if (depth[p.url] > T.maxClickDepth) add("fail", "B37", p.url, `${depth[p.url]} clicks from home (max ${T.maxClickDepth})`);
}
for (const p of live.filter((p) => p.intent === "town")) {
	const svcLinks = new Set(p.mainHrefs.filter((h) => /^\/services\/[^/]+\/$/.test(h)));
	if (svcLinks.size < T.minTownServiceLinks) add("fail", "B38", p.url, `Links to ${svcLinks.size} service pages (need ${T.minTownServiceLinks}+). Funnel-only town pages look like doorways.`);
}
for (const p of live.filter((p) => p.intent === "informational")) {
	if (!p.mainHrefs.some((h) => /^\/services\/[^/]+\/$/.test(h))) add("fail", "B40", p.url, "Post doesn't link to a service page (set service: in front matter)");
}
// B39: one anchor phrase -> one URL (nav-type phrases allowed)
const ALLOW = /^(home|contact|contact us|about|about us|blog|reviews|services|our services|all services|service areas|all service areas|learn more|read more|see all service areas|get a free estimate|free estimate|request an estimate|get my free estimate|back to home|privacy policy|sms terms|get started|continue reading|click to skip to main content)\b/i;
const phraseTo = {};
for (const p of pages)
	for (const a of p.anchors) {
		if (!a.href.startsWith("/") || !a.text || a.text.length > 60 || ALLOW.test(a.text) || /^call\b|^\(?\d{3}/i.test(a.text)) continue;
		const k = norm(a.text);
		(phraseTo[k] = phraseTo[k] || new Set()).add(a.href);
	}
for (const [k, hrefs] of Object.entries(phraseTo))
	if (hrefs.size > 1) add("fail", "B39", [...hrefs].join(" + "), `Link text "${k}" points to ${hrefs.size} different pages. One phrase, one page.`);

// ── B41: canonical + noindex ───────────────────────────────────────────────
for (const p of pages) {
	if (!p.canonical) add("fail", "B41", p.url, "Missing canonical");
	else if (p.canonical !== `${client.domain}${p.url}`) add("fail", "B41", p.url, `Canonical isn't self-referencing: ${p.canonical}`);
	if (["home", "service", "town"].includes(p.intent) && /noindex,\s*follow/i.test(p.robots)) add("fail", "B41", p.url, "Money page is noindex");
}

// ── B42: sitemap ───────────────────────────────────────────────────────────
const smPath = path.join(PUBLIC, "sitemap.xml");
if (!fs.existsSync(smPath)) add("fail", "B42", "/sitemap.xml", "Missing sitemap.xml");
else {
	const sm = fs.readFileSync(smPath, "utf8");
	const inSm = new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(client.domain, "")));
	for (const p of live) if (!inSm.has(p.url)) add("warn", "B42", p.url, "Not in sitemap.xml");
	for (const u of inSm) {
		if (redirectFrom.has(u)) add("fail", "B42", u, "Redirected URL is in sitemap.xml");
		if (byUrl[u] && !indexable(byUrl[u])) add("warn", "B42", u, "noindex page is in sitemap.xml");
	}
}

// ── B44-B45: schema ────────────────────────────────────────────────────────
const addresses = new Set();
for (const p of pages) {
	if (!p.schema.length) {
		if (indexable(p)) add("warn", "B44", p.url, "No JSON-LD");
		continue;
	}
	let nodes = [];
	for (const s of p.schema) {
		try {
			const j = JSON.parse(s);
			nodes = nodes.concat(j["@graph"] || [j]);
		} catch (e) {
			add("fail", "B44", p.url, `Schema JSON is invalid: ${e.message}`);
		}
	}
	const types = (n) => [].concat(n["@type"] || []);
	const biz = nodes.find((n) => types(n).includes("LocalBusiness"));
	if (biz) {
		if (biz.aggregateRating || biz.review) add("fail", "B44", p.url, "aggregateRating/review on the business node (self-serving reviews aren't allowed)");
		if (biz.address) addresses.add(JSON.stringify(biz.address));
		if (biz.telephone && !p.html.includes(biz.telephone.replace(/[()]/g, "").slice(-8))) add("warn", "B44", p.url, "Schema phone not visible on the page");
	}
	const json = JSON.stringify(nodes);
	if (p.intent === "town" && (json.match(/"PostalAddress"/g) || []).length > 1) add("fail", "B44", p.url, "Town page has its own PostalAddress. Town pages use areaServed, never a town address.");
	// No bylines: a post's author is the business node, never a Person.
	const post = nodes.find((n) => types(n).includes("BlogPosting"));
	if (post && (!post.author || post.author["@type"] === "Person" || (biz && post.author["@id"] !== biz["@id"])))
		add("fail", "B44", p.url, "BlogPosting author must be the business (@id), never a person");
	if (/class="cs-author-(box|name)"/.test(p.html)) add("fail", "B44", p.url, "Byline or author box on the page. Posts credit the business, no bylines.");
	const faq = nodes.find((n) => types(n).includes("FAQPage"));
	if (faq && (faq.mainEntity || []).length !== p.faqItems) add("warn", "B44", p.url, `FAQ markup has ${(faq.mainEntity || []).length} questions, page shows ${p.faqItems}`);
	if (p.url !== "/" && indexable(p)) {
		const bc = nodes.find((n) => types(n).includes("BreadcrumbList"));
		const items = (bc && bc.itemListElement) || [];
		if (items.length < 2 || items.some((it, i) => it.position !== i + 1)) add("fail", "B45", p.url, "Missing or broken BreadcrumbList");
	}
}
if (addresses.size > 1) add("fail", "B44", "(site)", `${addresses.size} different business addresses in schema. There should be one.`);
if (client.address.hideStreet && [...addresses].some((a) => JSON.parse(a).streetAddress)) add("fail", "B44", "(site)", "Address is hidden on GBP but a street address is in schema");

// ── B46: images ────────────────────────────────────────────────────────────
for (const p of pages) {
	const noAlt = p.imgs.filter((i) => !/\balt\b/i.test(i.raw)).length;
	const noSize = p.imgs.filter((i) => !i.width || !i.height).length;
	if (noAlt) add("warn", "B46", p.url, `${noAlt} image(s) missing alt`);
	if (noSize) add("warn", "B46", p.url, `${noSize} image(s) missing width/height (layout shift)`);
	const hero = p.imgs[1]; // [0] is the logo
	if (hero && hero.loading === "lazy" && /cs-background|int-hero|hero-143/.test(p.html.slice(0, p.html.indexOf(hero.raw)).slice(-1500)))
		add("warn", "B46", p.url, "Hero image is lazy-loaded (hurts LCP)");
}

// ── GEO: AI crawlers, llms.txt, answer-first posts ─────────────────────────
// AI answers (ChatGPT, Perplexity, Claude, Gemini) can only quote what they may read.
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Google-Extended", "Bingbot"];
const robotsPath = path.join(PUBLIC, "robots.txt");
if (!fs.existsSync(robotsPath)) add("fail", "GEO", "/robots.txt", "Missing robots.txt");
else {
	const robots = fs.readFileSync(robotsPath, "utf8");
	// Split into "User-agent:" groups and read each group's rules
	const groups = robots.split(/\n(?=User-agent:)/i);
	const ruleFor = (bot) => {
		const g = groups.find((x) => new RegExp(`^User-agent:\\s*${bot}\\s*$`, "im").test(x));
		return g ? (/^Disallow:\s*\/\s*$/im.test(g) ? "blocked" : "allowed") : null;
	};
	for (const bot of AI_BOTS) {
		const r = ruleFor(bot);
		if (!r) add("fail", "GEO", "/robots.txt", `No "User-agent: ${bot}" group. AI crawlers must be named.`);
		else if (client.indexable && r === "blocked") add("fail", "GEO", "/robots.txt", `${bot} is blocked on a live site`);
	}
	if (!/^Sitemap:\s*\S+/im.test(robots)) add("fail", "GEO", "/robots.txt", "No Sitemap line");
	if (!client.indexable && ruleFor("\\*") !== "blocked") add("warn", "GEO", "/robots.txt", "Staging site, but robots.txt doesn't block crawlers");
}
const llmsPath = path.join(PUBLIC, "llms.txt");
if (!fs.existsSync(llmsPath)) add("fail", "GEO", "/llms.txt", "Missing llms.txt");
else if (client.indexable) {
	const llms = fs.readFileSync(llmsPath, "utf8");
	if (!llms.includes(client.phoneFormatted)) add("fail", "GEO", "/llms.txt", "Business summary has no phone number");
	for (const s of srcServices) if (!llms.includes(`/services/${s.slug}/`)) add("warn", "GEO", "/llms.txt", `Service page /services/${s.slug}/ not listed`);
}
// Answer block: the first paragraph of a post answers the title question in its first 60 words
const bodyWords = (md) =>
	md
		.replace(/<[^>]+>/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		.replace(/[*_`>#|]/g, " ");
for (const p of srcPosts) {
	const url = `/blog/${p.data.url || p.slug}/`;
	if (!byUrl[url]) continue; // future-dated or hidden
	const paras = p.content.split(/\n\s*\n/).map((x) => x.trim()).filter((x) => x && !/^(#|!\[|<(img|picture|figure))/.test(x));
	const first = bodyWords(paras[0] || "").split(/\s+/).filter(Boolean);
	const first60 = new Set(keyTokens(first.slice(0, 60).join(" ")));
	const kt = keyTokens(p.data.keyword || p.data.title || "");
	const hit = kt.filter((w) => first60.has(w)).length;
	if (first.length < 20 || first.length > 80 || (kt.length && hit / kt.length < 0.5))
		add("warn", "GEO", url, `No answer block: open with a 40-60 word paragraph that answers "${p.data.title}" and names it (first paragraph is ${first.length} words, ${hit}/${kt.length} keyword words in the first 60)`);
}

// ── Site-level notes ───────────────────────────────────────────────────────
const lum = (hex) => {
	const c = hex.replace("#", "").match(/.{2}/g).map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
	return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
for (const key of ["primary", "secondary"]) {
	const hex = client.brand && client.brand[key];
	if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) continue;
	const ratio = 1.05 / (lum(hex) + 0.05);
	if (ratio < 4.5) add("warn", "A11Y", "(site)", `brand.${key} ${hex} is ${ratio.toFixed(1)}:1 against white text. Darken it to pass 4.5:1.`);
}
if (DEMO) add("info", "-", "(site)", "client.demo is true: missing local proof is a warning, not a failure.");
if (!client.indexable) add("info", "-", "(site)", "client.indexable is false: every page is noindex. Flip it at launch.");
if (!client.tracking.gtmId && !client.tracking.ga4Id) add("info", "-", "(site)", "No GTM or GA4 ID in client.js");
if (!client.google.businessProfileUrl) add("info", "-", "(site)", "No Google Business Profile URL in client.js");

// ── Report ─────────────────────────────────────────────────────────────────
const count = (lvl) => issues.filter((i) => i.level === lvl).length;
const summary = {
	date: new Date().toISOString(),
	site: client.name,
	pages: pages.length,
	indexable: live.length,
	byIntent: live.reduce((a, p) => ((a[p.intent] = (a[p.intent] || 0) + 1), a), {}),
	fails: count("fail"),
	warnings: count("warn"),
};
fs.writeFileSync(path.join(ROOT, "seo-report.json"), JSON.stringify({ summary, targets: Object.fromEntries(Object.entries(targets).map(([u, t]) => [u, { intent: t.intent, keyword: t.keyword }])), issues }, null, 2));

const icon = { fail: "✖ FAIL", warn: "▲ warn", info: "·" };
for (const lvl of ["fail", "warn", "info"])
	for (const i of issues.filter((x) => x.level === lvl)) console.log(`${icon[lvl]} [${i.rule}] ${i.url}  ${i.msg}`);
console.log(
	`\n${summary.pages} pages (${Object.entries(summary.byIntent).map(([k, v]) => `${v} ${k}`).join(", ")}). ${summary.fails} fails, ${summary.warnings} warnings. Report: seo-report.json`,
);
process.exit(summary.fails ? 1 : 0);
