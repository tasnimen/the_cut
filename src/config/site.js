export const site = Object.freeze({
  name: "The Cut Barbershop",
  shortName: "The Cut",
  brand: Object.freeze({
    main: "THE CUT",
    sub: "BARBERSHOP",
  }),
  description: "Thoughtful barbering, considered grooming, and good company.",
  locale: "en-US",
  currency: "USD",
  timeZone: "America/New_York",
  phoneCountry: "US",
  // Owner-supplied contact details. Leave null until confirmed; the UI renders only what is set.
  contact: Object.freeze({ phone: null, email: null }),
  social: Object.freeze({ instagram: null, facebook: null, tiktok: null, x: null, youtube: null }),
  location: Object.freeze({
    city: "New York",
    region: "NY",
    country: "US",
    postalCode: null,
    streetAddress: null,
  }),
});
