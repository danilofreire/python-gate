// Block list shared by the quiz (content.js) and the toolbar popup (popup.js).

const DEFAULT_SITES = ["x.com", "twitter.com", "youtube.com", "uol.com.br", "reddit.com"];

// "www.youtube.com" and "m.youtube.com" both match the entry "youtube.com".
const matchesSite = (hostname, sites) =>
  sites.some((site) => hostname === site || hostname.endsWith("." + site));

// Lets the test script load this file in Node. Chrome ignores it.
if (typeof module !== "undefined") module.exports = { DEFAULT_SITES, matchesSite };
