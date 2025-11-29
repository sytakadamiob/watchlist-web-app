# Fixing Firebase API Key Error

## Step 0: Keep your Firebase config out of Git

1. Copy `config/firebase-config.example.js` → `config/firebase-config.js`.
2. Paste your real Firebase Web API config into `config/firebase-config.js`.
3. Never commit `config/firebase-config.js` (it's already listed in `.gitignore`).
4. If `main.js` throws `Missing Firebase config`, it means this file is absent or still has placeholders.

The error "API key not valid" usually means one of these issues:

## Step 1: Enable Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **watchlist-app-f1dbc**
3. Click **Authentication** in the left sidebar
4. Click **Get Started** (if you haven't enabled it yet)
5. Go to **Sign-in method** tab
6. Click on **Google** provider
7. **Enable** it
8. Add your email as a test user (optional, for testing)
9. Click **Save**

## Step 2: Fix API Key Restrictions

The API key might be restricted and not allowing localhost. Here's how to fix it:

### Option A: Allow localhost in API Key Restrictions (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **watchlist-app-f1dbc**
3. Go to **APIs & Services** → **Credentials**
4. Find your API key (the one you reset/created for this project)
5. Click on it to edit
6. Under **Application restrictions**, select **HTTP referrers (web sites)**
7. Click **Add an item** and add these referrers:
   - `http://localhost:8000/*`
   - `http://localhost:*/*`
   - `http://127.0.0.1:*/*`
   - `http://localhost/*`
8. Under **API restrictions**, make sure these are enabled:
   - **Identity Toolkit API**
   - **Firebase Installations API**
   - Or select **Don't restrict key** (for development)
9. Click **Save**

### Option B: Get a New API Key (If the above doesn't work)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **watchlist-app-f1dbc**
3. Click the gear icon ⚙️ → **Project settings**
4. Scroll down to **Your apps** section
5. Find your web app or click **Add app** → **Web** if you don't have one
6. Copy the values for `apiKey`, `authDomain`, etc.
7. Paste them into `config/firebase-config.js` (see Step 0)

## Step 3: Verify Firebase Services are Enabled

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **watchlist-app-f1dbc**
3. Go to **APIs & Services** → **Library**
4. Search for and **Enable** these APIs (if not already enabled):
   - **Identity Toolkit API**
   - **Firebase Installations API**
   - **Cloud Firestore API**

## Step 4: Check Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Firestore Database** in the left sidebar
4. Click **Create database** (if you haven't created it)
5. Start in **test mode** (for development)
6. Choose a location (closest to you)
7. Click **Enable**

## Step 5: Test Again

1. Make sure your local server is running: `python3 -m http.server 8000`
2. Open: `http://localhost:8000`
3. Try clicking "Sign in" again

## Common Issues

- **"API key not valid"**: Check API key restrictions (Step 2)
- **"Auth domain not authorized"**: Add `localhost` to authorized domains in Firebase Console → Authentication → Settings → Authorized domains
- **"Permission denied"**: Check Firestore security rules (should allow reads/writes for authenticated users)

## Quick Test

After making changes, wait 1-2 minutes for changes to propagate, then try again.

