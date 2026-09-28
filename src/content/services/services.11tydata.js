// Every file in this folder becomes /services/<file-name>/
module.exports = {
	layout: "layouts/service.html",
	pageType: "service",
	eleventyComputed: {
		permalink: (data) => `/services/${data.page.fileSlug}/`,
		crumb: (data) => data.name,
		// "Roof Replacement in O'Fallon, MO | Ridgeline Roofing" (drops the brand if too long)
		title: (data) => {
			if (data.metaTitle) return data.metaTitle;
			const { city, state } = data.client.address;
			const base = `${data.name} in ${city}, ${state}`;
			const full = `${base} | ${data.client.name}`;
			return full.length <= 65 ? full : base;
		},
		// Hide services the client doesn't offer (client.services)
		eleventyExcludeFromCollections: (data) =>
			data.client.services.length > 0 && !data.client.services.includes(data.page.fileSlug),
	},
};
