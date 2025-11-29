# Verify API Key is Correct

The HTTP referrers look correct, so the issue might be that the API key in your code doesn't match Firebase.

## Step 1: Get the Correct API Key from Firebase

1. Go to: https://console.firebase.google.com/
2. Select your project: **watchlist-app-f1dbc**
3. Click the **⚙️ gear icon** → **Project settings**
4. Scroll down to **"Your apps"** section
5. Look for your web app (or create one if you don't have one):
   - If you see a web app listed, click on it
   - If you don't see one, click **"Add app"** → **Web** (</> icon)
     - Register app name: "VibeWatch" (or any name)
     - Check "Also set up Firebase Hosting" (optional)
     - Click **Register app**
6. You'll see a config object like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR-API-KEY-HERE",
     authDomain: "watchlist-app-f1dbc.firebaseapp.com",
     ...
   };
   ```
7. **Copy the `apiKey` value** (it should start with `AIzaSy...`)

## Step 2: Compare with Your Code

1. Open `main.js` in your project
2. Go to line 20
3. Compare the `apiKey` value with what you copied from Firebase
4. **If they're different**, replace it in `main.js`

## Step 3: Enable Required Services

### Enable Authentication:
1. In Firebase Console, click **Authentication** (left sidebar)
2. Click **Get Started** (if you haven't)
3. Go to **Sign-in method** tab
4. Click **Google**
5. **Enable** it
6. Add your email as a test user (optional)
7. Click **Save**

### Enable Firestore:
1. In Firebase Console, click **Firestore Database** (left sidebar)
2. Click **Create database** (if you haven't)
3. Start in **test mode** (for development)
4. Choose a location
5. Click **Enable**

## Step 4: Configure OAuth Consent Screen

1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=watchlist-app-f1dbc
2. If you see a warning, click **"Configure Consent Screen"**
3. Select **"External"**
4. Fill in:
   - **App name**: "VibeWatch"
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **"Save and Continue"**
6. On the "Scopes" page, click **"Save and Continue"** (no changes needed)
7. On the "Test users" page:
   - Click **"Add users"**
   - Add your email address
   - Click **"Add"**
8. Click **"Save and Continue"**
9. Click **"Back to Dashboard"**

## Step 5: Enable Required APIs

1. Go to: https://console.cloud.google.com/apis/library?project=watchlist-app-f1dbc
2. Search for and **Enable** these APIs (if not already enabled):
   - **Identity Toolkit API**
   - **Firebase Installations API**
   - **Cloud Firestore API**

## Step 6: Clear Cache and Test

1. **Hard refresh** your browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Or **clear browser cache** completely
3. Make sure your server is running: `python3 -m http.server 8000`
4. Go to: `http://localhost:8000`
5. Try signing in again

## If Still Not Working

The API key might be from a different project. Make sure:
- The `projectId` in `main.js` matches: `watchlist-app-f1dbc`
- The `authDomain` matches: `watchlist-app-f1dbc.firebaseapp.com`
- All values in `firebaseConfig` are from the same Firebase project

