// ─────────────────────────────────────────────────────────────────────────────
// CLIENT DATA - the single source of truth for this site.
// Every page, meta tag, schema block, footer and form reads from here.
// Fill this in first, then run `npm run scaffold` to create service pages.
// Leave a field "" (or []) if you don't have it. Templates skip empty fields.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
	// Which pack in /industries to use (roofing, plumbing, electrical, ...)
	industry: "roofing",

	// Public-facing business name used throughout templates.
	name: "Ridgeline Roofing & Exteriors",
	legalName: "Ridgeline Roofing & Exteriors LLC",
	tagline: "Roofing, gutters and siding for St. Charles and West County homes.",
	yearFounded: "2012",
	ownerName: "Mike Carter",
	// Short "about us" used in the footer and schema description.
	about: "Ridgeline Roofing & Exteriors is a local, owner-run roofing company in O'Fallon, MO. We replace and repair roofs, help with storm and hail damage, and install gutters and siding.",
	// One or two lines on who the owner is. Shown on the About page.
	ownerBio: "",
	// State license / registration numbers. Shown in the footer and schema. Leave [] if none.
	licenses: [],
	// Real badges only (BBB, manufacturer programs, associations). { name, url }
	credentials: [],

	email: "office@example.com",
	phoneForTel: "636-555-0142",
	phoneFormatted: "(636) 555-0142",

	address: {
		lineOne: "123 Example Dr",
		lineTwo: "",
		city: "O'Fallon",
		state: "MO",
		zip: "63366",
		country: "US",
		mapLink: "https://maps.app.goo.gl/",
		// Service-area business with no storefront? Set true to hide the street address.
		hideStreet: false,
	},

	// Used for schema geo and "miles from our shop" on town pages.
	geo: { lat: 38.8106, lng: -90.6998 },

	// How the region is named in copy ("St. Louis area", "Kansas City metro")
	region: "St. Louis area",

	// Opening hours. 24h format. Leave a day out if closed.
	hours: [
		{ days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "07:00", closes: "18:00" },
		{ days: ["Saturday"], opens: "08:00", closes: "12:00" },
	],
	emergencyService: true, // shows "24/7 emergency" copy + badge

	// Real review numbers from Google. Used on the site and schema. Leave count 0 to hide.
	reviews: {
		rating: 4.9,
		count: 0,
		googleReviewsUrl: "",
		// A few real reviews to feature. { name, town, text, stars }
		featured: [],
	},

	// Services shown on the site. Must match file names in src/content/services/.
	// Leave [] to use every service in the pack.
	services: [],

	socials: {
		facebook: "",
		instagram: "",
		youtube: "",
		nextdoor: "",
	},

	google: {
		businessProfileUrl: "",
		reviewLinkUrl: "",
		// Google Maps embed URL for the contact page (Share > Embed a map > src)
		mapEmbedUrl: "",
	},

	// Tracking. GTM is preferred. If GTM is set, GA4 should be set up inside GTM instead.
	tracking: {
		gtmId: "",
		ga4Id: "",
		gscVerification: "", // just the content="..." value from the GSC HTML tag
		bingVerification: "",
	},

	// Lead form. GHL form ID from link.spaceagemediaworks.com. If empty, a Netlify form is used.
	forms: {
		ghlFormId: "",
		ghlHost: "https://link.spaceagemediaworks.com",
		// Where the Netlify fallback form sends people after submit (fires the conversion)
		thankYouPath: "/thank-you/",
	},

	// Needed for A2P 10DLC texting approval. Shows the SMS terms page + consent text.
	sms: {
		enabled: true,
	},

	offers: {
		// Short banner line, e.g. "Free roof inspections this month". Leave "" to hide.
		specialOffer: "",
		financing: false,
	},

	// Brand colors. These override the LESS defaults so every client gets their look
	// without touching CSS. primary and secondary need 4.5:1 contrast with white
	// (buttons use white text). `npm run audit` checks this.
	brand: {
		primary: "#c2410c",
		primaryLight: "#f97316",
		secondary: "#1c2e4a",
		headerColor: "#14213d",
		bodyTextColor: "#3d4451",
		dark: "#14213d",
		logo: "/assets/svgs/logo-black.svg",
		logoLight: "/assets/svgs/logo-light.svg",
		// 1200x630 image for social shares
		ogImage: "/assets/images/landing.jpg",
	},

	//! Make sure you include the file protocol (e.g. https://) and that NO TRAILING SLASH is included
	domain: "https://www.example.com",

	// false = noindex every page + block robots. Keep false for demos and staging.
	// Flip to true at launch.
	indexable: false,

	// Passing the isProduction variable for use in HTML templates
	isProduction: process.env.ELEVENTY_ENV === "PROD",
};
