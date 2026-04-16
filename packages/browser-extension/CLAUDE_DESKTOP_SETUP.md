# DriveMem — Claude Desktop MCP Configuration Guide

## Quick Setup

1. Open Claude Desktop → Settings → Developer → MCP Servers
2. Add a new server with this configuration:

```json
{
  "mcpServers": {
    "drivemem": {
      "url": "https://drivemem.cloud/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

3. Replace `YOUR_API_KEY` with your DriveMem API key (get one at drivemem.cloud/settings → Developer tab)
4. Restart Claude Desktop

## What happens after connecting

- Claude automatically receives your Identity (name, role, goals)
- First tool call gets your recent knowledge context injected
- Claude can search your knowledge, ask questions, and store conclusions
- Auto Capture: conversations automatically extract valuable knowledge

## Available Tools

| Tool | Description |
|------|-------------|
| `aidrive_search` | Semantic search across your knowledge |
| `aidrive_ask` | RAG Q&A with cited sources |
| `aidrive_store` | Save knowledge |
| `aidrive_compile_context` | Generate task-relevant briefing |
| `aidrive_auto_capture` | Extract decisions/conclusions from text |
| `aidrive_list_files` | List files in knowledge base |
| `aidrive_file_detail` | Get file details + AI summary |

## Verification

After setup, ask Claude: "What do you know about me from DriveMem?"

If connected correctly, Claude will call `aidrive_search` and return information from your knowledge base.

## Troubleshooting

- **"No MCP servers configured"** — Check JSON syntax in settings
- **"Unauthorized"** — Verify API key is correct
- **"Connection failed"** — Check internet connection, try `https://drivemem.cloud/api/health`
