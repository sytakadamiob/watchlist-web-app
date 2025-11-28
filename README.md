# watch-l8r

Watch-l8r is a Firebase-powered watchlist tracker that lets you search TMDb titles, save them to collections, organize status, and sync across devices via Google auth. It’s built as a static site (HTML/CSS/JS) that runs on a simple local server.

## Features

- Google sign-in via Firebase Authentication
- Firestore-backed watchlist data, reminders, and stats
- TMDb search with movie/TV filtering
- Drag-and-drop ordering, favorites, tags, and status chips
- Responsive dark UI with a hero headline and reminder, stats, and collections panels

## Prerequisites

- Python 3 or Node.js for serving the static files locally
- Firebase project with Authentication (Google provider) and Firestore enabled
- TMDb API key (free account)

## Local setup

1. **Clone the repo**
   ```bash
   git clone git@github.com:sytakadamiob/watchlist-web-app.git
   cd watchlist-web-app
   ```
2. **Create your Firebase config file**
   - Copy `firebase-config.example.js` to `firebase-config.js`.
   - Fill in your Firebase Web app values (apiKey, authDomain, projectId, etc.).
   - This file is git-ignored so it stays local.
3. **Add your TMDb key**  
   Open `main.js` and set `TMDB_API_KEY` near the top.
4. **Start a local server (choose one)**
   - Python:
     ```bash
     ./start-server.sh
     # or
     python3 -m http.server 8000
     ```
   - Node http-server:
     ```bash
     npx http-server -p 8000
     ```
5. Visit `http://localhost:8000` in the browser.

> **Note:** Firebase auth fails on `file://` so always run through `http://localhost`.

## Firebase / Auth configuration

- Enable Google provider under **Firebase Auth → Sign-in method**.
- Add `localhost` (and any deployed domains) under **Auth → Settings → Authorized domains**.
- In Google Cloud Console, edit your OAuth client:
  - Authorized origins: `http://localhost:8000`, `http://localhost`, your production domains.
  - Authorized redirect URIs: `http://localhost:8000/__/auth/handler`, `https://YOUR_PROJECT.firebaseapp.com/__/auth/handler`, etc.

## Deploying

You can host the static files anywhere (Firebase Hosting, Netlify, Cloudflare Pages). Remember to keep secrets out of the repo and configure environment-specific Firebase configs on the server side if needed.

## Troubleshooting

- See `README-SERVER.md` for more detailed local server instructions.
- `FIX-LOCALHOST.md` and `TROUBLESHOOTING.md` cover common Firebase/API errors.
- If `redirect_uri_mismatch` appears, re-check the OAuth client allowed URI list.

## License

MIT — see LICENSE (add if applicable).

