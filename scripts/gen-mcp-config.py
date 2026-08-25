import json, os, re, pathlib

root = pathlib.Path("/Users/hammamkhaled/Documents/Hammam_CEO/SaaSs/saasname")
env = {}
for line in (root/".env.local").read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

def need(k):
    v = env.get(k, "")
    if not v or v.endswith("...") or v in ("changeme", "your-token-here"):
        return None
    return v

servers = {}
missing = []

gh = need("GITHUB_PERSONAL_ACCESS_TOKEN")
if gh:
    servers["saasname-github"] = {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {"GITHUB_PERSONAL_ACCESS_TOKEN": gh},
    }
else:
    missing.append("GITHUB_PERSONAL_ACCESS_TOKEN")

sb = need("SUPABASE_ACCESS_TOKEN")
if sb:
    servers["saasname-supabase"] = {
        "command": "npx",
        "args": ["-y", "@supabase/mcp-server-supabase@latest",
                 "--project-ref", "oypgpjqjuvmuiwgjxeaw"],
        "env": {"SUPABASE_ACCESS_TOKEN": sb},
    }
else:
    missing.append("SUPABASE_ACCESS_TOKEN")

# Vercel: no npm stdio server exists; use the official hosted MCP (OAuth, no token)
servers["saasname-vercel"] = {"type": "http", "url": "https://mcp.vercel.com"}

pd = need("PADDLE_API_KEY")
if pd:
    servers["saasname-paddle"] = {
        "command": "npx",
        "args": ["-y", "@paddle/paddle-mcp@latest"],
        "env": {"PADDLE_API_KEY": pd},
    }
else:
    missing.append("PADDLE_API_KEY")

# Google Analytics: official server is `analytics-mcp` on PyPI (googleanalytics org)
ga_creds = need("GOOGLE_APPLICATION_CREDENTIALS")
ga = {
    "command": "uvx",
    "args": ["--from", "analytics-mcp", "google-analytics-mcp"],
}
if ga_creds:
    ga["env"] = {"GOOGLE_APPLICATION_CREDENTIALS": ga_creds}
else:
    missing.append("GOOGLE_APPLICATION_CREDENTIALS (GA server will fall back to gcloud ADC)")
servers["saasname-google-analytics"] = ga

(root/".mcp.json").write_text(json.dumps({"mcpServers": servers}, indent=2) + "\n")
print("wrote .mcp.json with servers:", ", ".join(servers))
print("missing/placeholder:", ", ".join(missing) if missing else "none")
