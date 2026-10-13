// Every file in this folder becomes /service-areas/<file-name>/
// Exception: the home city. The home page owns it, so that file is skipped and
// its URL 301s to "/" (see src/_data/redirects.js).
const { isHomeCity, titleWithBrand } = require("../../config/utils/seo");

module.exports = {
	layout: "layouts/area.html",
	pageType: "area",
	eleventyComputed: {
		permalink: (data) => (isHomeCity(data.town, data.state, data.client) ? false : `/service-areas/${data.page.fileSlug}/`),
		eleventyExcludeFromCollections: (data) => isHomeCity(data.town, data.state, data.client),
		crumb: (data) => `${data.town}, ${data.state}`,
		title: (data) => {
			if (data.metaTitle) return data.metaTitle;
			const label = data.industry.titleNoun || data.industry.label || "Services";
			return titleWithBrand(`${label} in ${data.town}, ${data.state}`, data.client);
		},
	},
};
