// Shared SEO rules used by the page data files AND scripts/seo-audit.js,
// so the build and the audit always agree.

const norm = (s = "") =>
	String(s)
		.toLowerCase()
		.replace(/&#39;|['’]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

// Town page for the city the shop is in? The home page owns that city, so the
// town page is skipped and 301'd to "/" (unless client.homeCityException).
const isHomeCity = (town, state, client) =>
	!client.homeCityException &&
	norm(town).replace(/^saint /, "st ") === norm(client.address.city).replace(/^saint /, "st ") &&
	norm(state) === norm(client.address.state);

// "<base> | <Brand>" if it fits in 60 characters, otherwise just <base>.
// 51-60 characters get rewritten by Google the least (Zyppy, 2026).
const titleWithBrand = (base, client, max = 60) => {
	const brand = client.shortName || client.name;
	const full = `${base} | ${brand}`;
	return full.length <= max ? full : base;
};

module.exports = { norm, isHomeCity, titleWithBrand };
