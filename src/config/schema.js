// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA (JSON-LD) BUILDER
// Outputs one connected @graph per page: the business, the website, the page,
// breadcrumbs, and whatever the page is about (a service, a town, a post, FAQs).
// Everything links back to the business by @id, which is how Google ties the
// site, the Business Profile and the service areas together.
// Usage in base.html: {% schema %}
// ─────────────────────────────────────────────────────────────────────────────

const { plain, imageOr } = require("./filters/local");

function clean(obj) {
	// Drop empty values so we never ship "" or [] into schema
	if (Array.isArray(obj)) return obj.map(clean).filter((v) => v !== undefined);
	if (obj && typeof obj === "object") {
		const out = {};
		for (const [k, v] of Object.entries(obj)) {
			const c = clean(v);
			if (c === undefined || c === "" || c === null) continue;
			if (Array.isArray(c) && !c.length) continue;
			if (typeof c === "object" && !Array.isArray(c) && !Object.keys(c).length) continue;
			out[k] = c;
		}
		return out;
	}
	return obj;
}

function stripMd(text = "") {
	return String(text)
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/[*_`#>]/g, "")
		.trim();
}

function cityNode(area, domain) {
	const d = area.data;
	return {
		"@type": "City",
		name: `${d.town}, ${d.state}`,
		sameAs: d.wikipedia,
		containedInPlace: d.county ? { "@type": "AdministrativeArea", name: `${d.county}, ${d.state}` } : undefined,
		url: `${domain}${area.url}`,
	};
}

module.exports = function schema(data) {
	const { client, industry = {}, page, collections = {} } = data;
	const domain = client.domain;
	const url = `${domain}${page.url}`;
	const bizId = `${domain}/#business`;
	const siteId = `${domain}/#website`;
	const pageId = `${url}#webpage`;
	const crumbId = `${url}#breadcrumb`;
	const pageType = data.pageType || (page.url === "/" ? "home" : "page");

	const areas = collections.areas || [];
	const services = (collections.services || []).filter(
		(s) => !client.services || !client.services.length || client.services.includes(s.page.fileSlug),
	);

	// ── The business ─────────────────────────────────────────────────────────
	const addr = client.address;
	const business = {
		"@type": [industry.schemaType || "HomeAndConstructionBusiness", "LocalBusiness"].filter(
			(t, i, a) => a.indexOf(t) === i,
		),
		"@id": bizId,
		name: client.name,
		legalName: client.legalName,
		description: client.about,
		slogan: client.tagline,
		url: `${domain}/`,
		telephone: client.phoneFormatted,
		email: client.email,
		foundingDate: client.yearFounded,
		founder: client.ownerName ? { "@type": "Person", name: client.ownerName } : undefined,
		logo: client.brand && client.brand.logo ? `${domain}${client.brand.logo}` : undefined,
		image: client.brand && client.brand.ogImage ? `${domain}${client.brand.ogImage}` : undefined,
		address: {
			"@type": "PostalAddress",
			streetAddress: addr.hideStreet ? undefined : [addr.lineOne, addr.lineTwo].filter(Boolean).join(", "),
			addressLocality: addr.city,
			addressRegion: addr.state,
			postalCode: addr.zip,
			addressCountry: addr.country,
		},
		geo: client.geo ? { "@type": "GeoCoordinates", latitude: client.geo.lat, longitude: client.geo.lng } : undefined,
		hasMap: client.google && client.google.businessProfileUrl ? client.google.businessProfileUrl : addr.mapLink,
		// Must match the Google Business Profile hours. Emergency service is mentioned in copy, not here.
		openingHoursSpecification: (client.hours || []).map((h) => ({
			"@type": "OpeningHoursSpecification",
			dayOfWeek: h.days,
			opens: h.opens,
			closes: h.closes,
		})),
		areaServed: areas.map((a) => cityNode(a, domain)),
		knowsAbout: services.map((s) => s.data.name),
		hasOfferCatalog: services.length
			? {
					"@type": "OfferCatalog",
					name: `${industry.label || ""} services`.trim(),
					itemListElement: services.map((s) => ({
						"@type": "Offer",
						itemOffered: { "@type": "Service", name: s.data.name, url: `${domain}${s.url}` },
					})),
				}
			: undefined,
		sameAs: [
			...Object.values(client.socials || {}),
			client.google && client.google.businessProfileUrl,
			...(client.credentials || []).map((c) => c.url),
		].filter(Boolean),
		// No aggregateRating here: Google ignores self-hosted reviews for local businesses.
		// Reviews are shown as plain HTML instead.
	};

	const website = {
		"@type": "WebSite",
		"@id": siteId,
		url: `${domain}/`,
		name: client.name,
		publisher: { "@id": bizId },
	};

	// ── Breadcrumbs ──────────────────────────────────────────────────────────
	const crumbs = [{ name: "Home", url: `${domain}/` }];
	if (pageType === "service") crumbs.push({ name: "Services", url: `${domain}/services/` });
	if (pageType === "area") crumbs.push({ name: "Service Areas", url: `${domain}/service-areas/` });
	if (pageType === "post") crumbs.push({ name: "Blog", url: `${domain}/blog/` });
	if (pageType !== "home") crumbs.push({ name: plain(data.crumb || data.name || data.town || data.title), url });

	const breadcrumb = {
		"@type": "BreadcrumbList",
		"@id": crumbId,
		itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
	};

	// ── The page ─────────────────────────────────────────────────────────────
	const faqs = pageType === "home" ? industry.faqs || [] : data.faqs || [];
	const webpage = {
		"@type": faqs.length ? ["WebPage", "FAQPage"] : "WebPage",
		"@id": pageId,
		url,
		name: plain(data.title),
		description: plain(data.description),
		isPartOf: { "@id": siteId },
		breadcrumb: { "@id": crumbId },
		about: pageType === "home" || pageType === "page" ? { "@id": bizId } : undefined,
		inLanguage: "en-US",
		mainEntity: faqs.length
			? faqs.map((f) => ({
					"@type": "Question",
					name: f.q,
					acceptedAnswer: { "@type": "Answer", text: stripMd(f.a) },
				}))
			: undefined,
	};

	const graph = [business, website, webpage, breadcrumb];

	// ── Page-specific nodes ─────────────────────────────────────────────────
	if (pageType === "service") {
		const serviceId = `${url}#service`;
		webpage.about = { "@id": serviceId };
		graph.push({
			"@type": "Service",
			"@id": serviceId,
			name: data.name,
			serviceType: data.schemaServiceType || data.name,
			description: data.summary || data.description,
			url,
			image: imageOr(data.image, null) ? `${domain}${data.image}` : undefined,
			provider: { "@id": bizId },
			areaServed: areas.map((a) => cityNode(a, domain)),
		});
	}

	if (pageType === "area") {
		const placeId = `${url}#place`;
		webpage.about = { "@id": placeId };
		graph.push({
			...cityNode({ data, url: page.url }, domain),
			"@id": placeId,
			geo: data.geo ? { "@type": "GeoCoordinates", latitude: data.geo.lat, longitude: data.geo.lng } : undefined,
		});
		graph.push({
			"@type": "Service",
			"@id": `${url}#service`,
			name: `${industry.label || "Home services"} in ${data.town}, ${data.state}`,
			serviceType: industry.label,
			provider: { "@id": bizId },
			areaServed: { "@id": placeId },
			url,
		});
	}

	if (pageType === "post") {
		graph.push({
			"@type": "BlogPosting",
			"@id": `${url}#article`,
			headline: plain(data.title),
			description: data.description,
			image: data.image ? `${domain}${data.image}` : undefined,
			datePublished: data.date ? new Date(data.date).toISOString() : undefined,
			dateModified: data.updated
				? new Date(data.updated).toISOString()
				: data.date
					? new Date(data.date).toISOString()
					: undefined,
			author: data.author ? { "@type": "Person", name: data.author } : { "@id": bizId },
			publisher: { "@id": bizId },
			mainEntityOfPage: { "@id": pageId },
			isPartOf: { "@id": siteId },
		});
	}

	return `<script type="application/ld+json">${JSON.stringify(clean({ "@context": "https://schema.org", "@graph": graph }))}</script>`;
};
