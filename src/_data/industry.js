// Loads the industry pack (industries/<industry>/pack.json) named in client.js.
// Tokens like {{business}} and {{city}} are filled in from client data.
const fs = require("fs");
const path = require("path");
const client = require("./client");
const fillTokens = require("../config/utils/fillTokens");

module.exports = function () {
	const file = path.join(__dirname, "../../industries", client.industry, "pack.json");
	if (!fs.existsSync(file)) {
		console.warn(`[industry] No pack found at ${file}`);
		return { schemaType: "HomeAndConstructionBusiness", faqs: [], trustPoints: [], process: [], blogTopics: [] };
	}
	return JSON.parse(fillTokens(fs.readFileSync(file, "utf8"), client));
};
