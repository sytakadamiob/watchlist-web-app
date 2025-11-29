# Running watch-l8r Locally

Firebase requires the app to run on `http://` or `https://` protocol, not `file://`. 

## Quick Start (Easiest Method)

### Option 1: Using the provided script (Python)

1. Open Terminal
2. Navigate to the project folder:
   ```bash
   cd "/Users/Shared/Files From d.localized/SyT/My Coding/Cursor AI/watchlist-web-app"
   ```
3. Run the server script:
   ```bash
   ./start-server.sh
   ```
4. Open your browser to: **http://localhost:8000**

### Option 2: Manual Python command

1. Open Terminal
2. Navigate to the project folder:
   ```bash
   cd "/Users/Shared/Files From d.localized/SyT/My Coding/Cursor AI/watchlist-web-app"
   ```
3. Start the server:
   ```bash
   python3 -m http.server 8000
   ```
4. Open your browser to: **http://localhost:8000**

### Option 3: Using Node.js (if you have it installed)

1. Install http-server globally (one-time):
   ```bash
   npm install -g http-server
   ```

2. Navigate to the project folder and run:
   ```bash
   cd "/Users/Shared/Files From d.localized/SyT/My Coding/Cursor AI/watchlist-web-app"
   http-server -p 8000
   ```

3. Open your browser to: **http://localhost:8000**

### Option 4: VS Code Live Server Extension

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Important Notes

- Keep the terminal window open while testing
- The server must be running for Firebase authentication to work
- Use `http://localhost:8000` (not `file://`) to access the app

