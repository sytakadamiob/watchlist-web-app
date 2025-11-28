const functions = require("firebase-functions");
const fetch = require("node-fetch");

// Set this via CLI: firebase functions:config:set tmdb.key="YOUR_TMDB_API_KEY"
const getTmdbKey = () => functions.config().tmdb && functions.config().tmdb.key;

exports.tmdbSearch = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  const apiKey = getTmdbKey();
  if (!apiKey) {
    return res.status(500).json({ error: "TMDb API key not configured." });
  }

  const query = (req.query.query || "").toString();
  const type = (req.query.type || "multi").toString();

  if (!query) {
    return res.status(400).json({ error: "Missing query parameter." });
  }

  const endpoint = type === "multi" ? "search/multi" : `search/${type}`;
  const url = new URL(`https://api.themoviedb.org/3/${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");

  try {
    const tmdbRes = await fetch(url);
    if (!tmdbRes.ok) {
      return res.status(tmdbRes.status).json({ error: "TMDb request failed." });
    }
    const data = await tmdbRes.json();
    return res.json({ results: data.results || [] });
  } catch (err) {
    console.error("TMDb proxy failed", err);
    return res.status(500).json({ error: "Proxy error." });
  }
});