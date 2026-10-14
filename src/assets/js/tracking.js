// Sends lead actions to GTM / GA4 as dataLayer events.
// In GTM: make Custom Event triggers for "phone_click", "email_click", "form_submit"
// and mark them as key events (conversions) in GA4.
(() => {
	window.dataLayer = window.dataLayer || [];
	// Reset per-event fields so one event's details don't stick to the next (GTM merges dataLayer pushes)
	const push = (event, extra = {}) =>
		window.dataLayer.push({ event, page_path: location.pathname, form_name: undefined, link_location: undefined, ...extra });

	document.addEventListener("click", (e) => {
		const link = e.target.closest("a[href]");
		if (!link) return;
		const href = link.getAttribute("href");
		if (href.startsWith("tel:")) push("phone_click", { link_location: link.dataset.loc || link.className });
		else if (href.startsWith("mailto:")) push("email_click");
		else if (href.includes("maps.app.goo.gl") || href.includes("google.com/maps")) push("directions_click");
	});

	document.addEventListener("submit", (e) => {
		const form = e.target;
		push("form_submit", { form_name: form.getAttribute("name") || form.id || "form" });
	});

	// GHL embedded forms post a message when submitted
	window.addEventListener("message", (e) => {
		if (typeof e.data !== "object" || !e.data) return;
		const type = e.data.type || e.data.event || "";
		if (/form[-_ ]?submi/i.test(type)) push("form_submit", { form_name: "ghl_form" });
	});
})();
