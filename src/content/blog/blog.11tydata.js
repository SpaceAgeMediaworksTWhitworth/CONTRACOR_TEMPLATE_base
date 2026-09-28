// Blog posts. Posts dated in the future (or marked draft: true) are skipped in
// production builds, so a batch of posts can be queued and go live on their date
// with a daily rebuild (Netlify build hook).
const isProduction = process.env.ELEVENTY_ENV === "PROD";
const isHidden = (data) => data.draft || (isProduction && data.date && new Date(data.date) > new Date());

module.exports = {
	layout: "layouts/post.html",
	tags: "post",
	pageType: "post",
	eleventyComputed: {
		preloadImg: (data) => data.image,
		permalink: (data) => (isHidden(data) ? false : `/blog/${data.url || data.page.fileSlug}/`),
		eleventyExcludeFromCollections: (data) => isHidden(data),
		crumb: (data) => data.title,
	},
};
