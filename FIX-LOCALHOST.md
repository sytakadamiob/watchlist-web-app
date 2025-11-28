# Fix Invalid Localhost Entries

The issue is that Google Cloud Console doesn't support wildcard ports (`:*/*`) in HTTP referrers.

## Correct Format for Localhost

You need to use **specific ports** or **no port wildcards**. Here's what to do:

### Step 1: Remove Invalid Entries

1. **Delete** the entry showing "Invalid website domain" (`http://127.0.0.1:*/*`)
2. **Delete** `http://localhost:*/*` (if it's also invalid)

### Step 2: Add Correct Entries

Click "Add" and add these **one by one** (use exact format):

```
http://localhost:8000
http://localhost:8080
http://localhost:3000
http://127.0.0.1:8000
http://127.0.0.1:8080
http://127.0.0.1:3000
```

**OR** if you want to allow all ports, you might need to add common ports:
- `http://localhost:8000`
- `http://localhost:8080`
- `http://localhost:3000`
- `http://localhost:5000`
- `http://localhost:4000`
- etc.

### Step 3: Keep the Working One

Keep `http://localhost:8000/*` if it's not showing as invalid (though the `/*` might not be needed).

### Alternative: Use IP Address Format

Try these formats:
- `http://localhost:8000` (no wildcard)
- `http://127.0.0.1:8000` (no wildcard)

### Important Note

Google Cloud Console HTTP referrers **do not support**:
- Wildcard ports like `:*/*`
- Query parameters or fragments

They **do support**:
- Specific ports: `http://localhost:8000`
- Domain wildcards: `http://*.example.com`
- Path wildcards: `http://localhost:8000/*` (but might not be needed)

