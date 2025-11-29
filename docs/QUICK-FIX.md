# Quick Fix: API Key Restrictions

## Step 1: Edit the API Key

1. On the Credentials page, click on **"Browser key (auto created by Firebase)"** (or click "Show key" then "Edit")
2. This will open the API key edit page

## Step 2: Add Localhost Restrictions

In the edit page:

### Application restrictions:
1. Select **"HTTP referrers (web sites)"**
2. Click **"Add an item"** and add these one by one:
   ```
   http://localhost:8000/*
   http://localhost:*/*
   http://127.0.0.1:*/*
   ```
3. Make sure all three are added

### API restrictions:
1. For development, select **"Don't restrict key"** (easiest)
2. OR select **"Restrict key"** and make sure these are checked:
   - Identity Toolkit API
   - Firebase Installations API

## Step 3: Save

1. Click **"Save"** at the bottom
2. Wait 1-2 minutes for changes to take effect

## Step 4: Enable Google Sign-In in Firebase

1. Go to: https://console.firebase.google.com/
2. Select project: **watchlist-app-f1dbc**
3. Click **Authentication** → **Get Started** (if needed)
4. Go to **Sign-in method** tab
5. Click **Google** → **Enable** → **Save**

## Step 5: Test

1. Refresh your browser at `http://localhost:8000`
2. Click "Sign in" button
3. It should work now!

