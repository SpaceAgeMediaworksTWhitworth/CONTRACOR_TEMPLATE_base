// Swaps {{business}}, {{city}}, {{state}}, {{region}}, {{phone}}, {{years}} for client values.
module.exports = function fillTokens(text, client) {
	const years = client.yearFounded ? String(new Date().getFullYear() - Number(client.yearFounded)) : "";
	const map = {
		business: client.name,
		city: client.address.city,
		state: client.address.state,
		region: client.region || `${client.address.city} area`,
		phone: client.phoneFormatted,
		years,
	};
	return text.replace(/\{\{\s*(business|city|state|region|phone|years)\s*\}\}/g, (_, key) => map[key] || "");
};
