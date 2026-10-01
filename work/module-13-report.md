# Module 13 Completion Report

## MCP Configuration

This repository contains two MCP configuration files in different formats, for two
different clients. Both point at the same local stdio server script.

**`.mcp.json`** (project root) — Claude Code format, uses the `mcpServers` key:

```json
{
  "mcpServers": {
    "echo-windows": {
      "type": "stdio",
      "command": "powershell",
      "args": [
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "./.vscode/mcp-echo.ps1"
      ],
      "env": {}
    }
  }
}
```

**`.vscode/mcp.json`** — VS Code / Copilot Chat format, uses the `servers` key:

```json
{
  "servers": {
    "echo-windows": {
      "command": "powershell",
      "args": ["-ExecutionPolicy", "Bypass", "-File", "./.vscode/mcp-echo.ps1"]
    }
  }
}
```

**Redaction note:** no values were redacted, because this configuration contains no
secrets. The server is a local stdio process launched by path; `env` is empty and
there are no API keys, tokens, or credentials to remove. The `[REDACTED]` placeholder
is therefore absent by fact, not by omission.

## Configured Servers

- `echo-windows` — local stdio server, implemented in `.vscode/mcp-echo.ps1`
  (PowerShell, newline-delimited JSON-RPC 2.0). Exposes three tools:
  - `echo` — returns the supplied message unchanged
  - `get_time` — current timestamp in ISO 8601, optional `utc` flag
  - `calculate` — arithmetic over two operands (`add`, `subtract`, `multiply`,
    `divide`, `power`, `modulo`)

This is the only server configured at project scope. A previously configured
`cai-mcp` server has been retired and is no longer in use.

## MCP Tool Test

- Tool used: `echo` (via `mcp__echo-windows__echo`)
- Input: `{"message": "Hello MCP!"}`
- Output:

```
Hello MCP!
```

### Additional tool calls verified

| Call | Output |
| --- | --- |
| `get_time()` | `2026-09-16T16:57:37+05:30` |
| `get_time(utc: true)` | `2026-09-16T11:26:01+00:00` |
| `calculate(multiply, 42, 17)` | `714` |
| `calculate(divide, 100, 4)` | `25` |
| `calculate(power, 2, 10)` | `1024` |
| `calculate(divide, 1, 0)` | error: `Division by zero.` |

Local and UTC timestamps are mutually consistent (16:57:37 +05:30 corresponds to
11:27:37 UTC). Tool-level failures such as division by zero are returned as results
with `isError: true`, so the model receives the message; only unknown *tool names*
return a JSON-RPC error (code `-32601`), per the MCP specification.

## Status Discrepancy (open item)

Tool calls through `echo-windows` succeed in the active session, as shown above.
However, running `claude mcp list` as a separate process still reports:

```
echo-windows: powershell -ExecutionPolicy Bypass -File ./.vscode/mcp-echo.ps1 - ⏸ Pending approval
```

The server is functional — the CLI health check appears to read project approval
state from a location that has no entry for this project path, whereas the running
session honours the `enabledMcpjsonServers` entry in `.claude/settings.local.json`.
This is a reporting inconsistency in the standalone CLI check, not a broken server,
but it is recorded here rather than presented as a clean "Connected" result.
