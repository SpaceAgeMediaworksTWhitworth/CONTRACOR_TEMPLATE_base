// Every file in this folder becomes /services/<file-name>/
const { titleWithBrand } = require("../../config/utils/seo");

module.exports = {
	layout: "layouts/service.html",
	pageType: "service",
	eleventyComputed: {
		permalink: (data) => `/services/${data.page.fileSlug}/`,
		crumb: (data) => data.name,
		// "Roof Repair in O'Fallon, MO | Ridgeline Roofing" (drops the brand past 60 chars)
		title: (data) => {
			if (data.metaTitle) return data.metaTitle;
			const { city, state } = data.client.address;
			return titleWithBrand(`${data.name} in ${city}, ${state}`, data.client);
		},
		// Hide services the client doesn't offer (client.services)
		eleventyExcludeFromCollections: (data) =>
			data.client.services.length > 0 && !data.client.services.includes(data.page.fileSlug),
	},
};
