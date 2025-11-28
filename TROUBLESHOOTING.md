# Troubleshooting API Key Error

If you're still getting "API key not valid" after adding localhost restrictions, try these steps:

## Step 1: Check API Restrictions

The issue might be that "Identity Toolkit API" is not in your restricted API list.

1. Go back to the API key edit page
2. Under **"API restrictions"**, click on the dropdown that says "24 APIs"
3. Make sure these APIs are checked:
   - ✅ **Identity Toolkit API** (CRITICAL for authentication)
   - ✅ **Firebase Installations API**
   - ✅ **Cloud Firestore API** (if using Firestore)
4. If you can't find them, click "Select APIs" and search for:
   - "Identity Toolkit"
   - "Firebase Installations"
5. **OR** for easier testing, select **"Don't restrict key"** temporarily

## Step 2: Enable Required APIs

1. Go to: https://console.cloud.google.com/apis/library
2. Search for and **Enable** these APIs (if not already enabled):
   - **Identity Toolkit API**
   - **Firebase Installations API**
   - **Cloud Firestore API**

## Step 3: Check OAuth Consent Screen

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. If you see a warning, click **"Configure Consent Screen"**
3. Select **"External"** (unless you have a Google Workspace)
4. Fill in:
   - App name: "VibeWatch" (or any name)
   - User support email: Your email
   - Developer contact: Your email
5. Click **"Save and Continue"** through the steps
6. Add your email as a test user in the "Test users" section

## Step 4: Verify API Key is Correct

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select project: **watchlist-app-f1dbc**
3. Click ⚙️ → **Project settings**
4. Scroll to **"Your apps"** section
5. Find your web app (or create one if missing)
6. Copy the **apiKey** value
7. Compare it with the one in `main.js` (line 20)
8. If different, update `main.js` with the correct key

## Step 5: Clear Browser Cache

1. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Or clear browser cache completely
3. Try again

## Step 6: Wait Longer

Sometimes changes take 5-10 minutes to propagate. Wait a bit longer and try again.

## Quick Test: Temporarily Remove API Restrictions

To test if restrictions are the issue:

1. Edit the API key
2. Under **"API restrictions"**, select **"Don't restrict key"**
3. Click **Save**
4. Wait 2 minutes
5. Try signing in again

If this works, then the issue is with the API restrictions list. Add back the restrictions and make sure "Identity Toolkit API" is included.

