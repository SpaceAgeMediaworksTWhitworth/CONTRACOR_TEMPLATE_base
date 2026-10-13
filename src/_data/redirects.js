// 301 redirects, written to /_redirects for Netlify by src/redirects.njk.
// - client.redirects: old site URLs -> new pages (add at launch)
// - automatic: a home-city town page -> "/" (the home page owns that city)
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const client = require("./client");
const { isHomeCity } = require("../config/utils/seo");

module.exports = function () {
	const list = [...(client.redirects || [])];
	const dir = path.join(__dirname, "../content/areas");
	for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
		const { data } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
		if (isHomeCity(data.town, data.state, client)) {
			list.push({ from: `/service-areas/${path.basename(file, ".md")}/`, to: "/" });
		}
	}
	return list;
};
