// Filters used by the local SEO templates.
const fs = require("fs");
const path = require("path");
const markdownIt = require("markdown-it");

const md = markdownIt({ html: true, typographer: true });

// Undo HTML escaping that happens when titles are built in front matter,
// so the layout escapes them exactly once.
function plain(text) {
	return String(text ?? "")
		.replace(/&amp;/g, "&")
		.replace(/&#39;|&#x27;|&apos;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">");
}

module.exports = {
	plain,
	// Render a markdown string (frontmatter fields like intro or FAQ answers)
	md: (text) => (text ? md.render(String(text)) : ""),
	mdInline: (text) => (text ? md.renderInline(String(text)) : ""),

	// Miles between two { lat, lng } points, rounded
	milesBetween(a, b) {
		if (!a || !b || a.lat == null || b.lat == null) return null;
		const toRad = (d) => (d * Math.PI) / 180;
		const R = 3958.8;
		const dLat = toRad(b.lat - a.lat);
		const dLng = toRad(b.lng - a.lng);
		const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
		return Math.round(2 * R * Math.asin(Math.sqrt(h)));
	},

	// Use an image if it exists in src/, otherwise the fallback. Keeps builds from
	// breaking before real client photos are added.
	imageOr(src, fallback) {
		if (src && fs.existsSync(path.join(process.cwd(), "src", src))) return src;
		return fallback;
	},

	// The n closest towns to a { lat, lng } point, not counting the current page
	nearest(areas, geo, n = 5, excludeUrl = "") {
		if (!areas || !geo) return [];
		return areas
			.filter((a) => a.url !== excludeUrl && a.data.geo)
			.map((a) => ({ area: a, miles: module.exports.milesBetween(geo, a.data.geo) }))
			.sort((x, y) => x.miles - y.miles)
			.slice(0, n);
	},

	// Keep only the services the client offers (client.services), in pack order
	offered(services, slugs) {
		if (!services) return [];
		if (!slugs || !slugs.length) return services;
		return services.filter((s) => slugs.includes(s.page.fileSlug));
	},

	// Look up items in a collection by fileSlug, keeping the order given
	bySlugs(collection, slugs) {
		if (!collection || !slugs) return [];
		return slugs.map((slug) => collection.find((item) => item.page.fileSlug === slug)).filter(Boolean);
	},

	// Trim meta descriptions to a safe length at a word break
	clip(text, max = 155) {
		text = plain(text);
		if (!text || text.length <= max) return text;
		return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
	},

	// "07:00" -> "7am"
	time12(t) {
		const [h, m] = String(t).split(":").map(Number);
		const suffix = h >= 12 ? "pm" : "am";
		const hour = h % 12 || 12;
		return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
	},

	// ["Monday",...,"Friday"] -> "Mon-Fri"
	dayRange(days) {
		if (!days || !days.length) return "";
		const short = (d) => d.slice(0, 3);
		return days.length > 2 ? `${short(days[0])}-${short(days[days.length - 1])}` : days.map(short).join(", ");
	},
};
