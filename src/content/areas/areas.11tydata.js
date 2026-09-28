// Every file in this folder becomes /service-areas/<file-name>/
module.exports = {
	layout: "layouts/area.html",
	pageType: "area",
	eleventyComputed: {
		permalink: (data) => `/service-areas/${data.page.fileSlug}/`,
		crumb: (data) => `${data.town}, ${data.state}`,
		title: (data) => {
			if (data.metaTitle) return data.metaTitle;
			const label = data.industry.titleNoun || data.industry.label || "Services";
			const base = `${label} in ${data.town}, ${data.state}`;
			const full = `${base} | ${data.client.name}`;
			return full.length <= 65 ? full : base;
		},
	},
};
