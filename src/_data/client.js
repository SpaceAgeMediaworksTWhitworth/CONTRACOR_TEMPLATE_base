module.exports = {
    business: {
        legalName: "Code Stitch Web Designs",
        displayName: "Code Stitch Web Designs",
        type: "Contractor",
        yearFounded: "",
    },

    // Public-facing business name used throughout templates.
    name: "Code Stitch Web Designs",

    email: "help@codestitch.app",
    phoneForTel: "555-779-4407",
    phoneFormatted: "(555) 779-4407",

    address: {
        lineOne: "First Address Line",
        lineTwo: "Second Address Line",
        city: "Denver",
        state: "CO",
        zip: "80206",
        country: "US",
        mapLink: "https://maps.app.goo.gl/TEdS5KoLC9ZcULuQ6",
    },

    serviceArea: {
        primaryCity: "Denver",
        state: "CO",
        citiesServed: [],
    },

    services: {
        primaryServices: [],
    },

    website: {
        featureOwner: false,
        featureTeam: false,
    },

    socials: {
        facebook: "https://www.facebook.com/",
        instagram: "https://www.instagram.com/",
    },

    google: {
        businessProfileUrl: "",
        reviewLinkUrl: "",
    },

    offers: {
        specialOffer: "",
    },

    //! Make sure you include the file protocol (e.g. https://) and that NO TRAILING SLASH is included
    domain: "https://www.example.com",

    // Passing the isProduction variable for use in HTML templates
    isProduction: process.env.ELEVENTY_ENV === "PROD",
};
