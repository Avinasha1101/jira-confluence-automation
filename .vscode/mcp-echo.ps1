# Minimal MCP server (stdio transport) exposing a single "echo" tool.
# Protocol: newline-delimited JSON-RPC 2.0 messages over stdin/stdout.

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Send-Message($obj) {
    $json = $obj | ConvertTo-Json -Depth 10 -Compress
    [Console]::Out.Write($json + "`n")
    [Console]::Out.Flush()
}

function Send-Result($id, $result) {
    Send-Message([ordered]@{
        jsonrpc = "2.0"
        id      = $id
        result  = $result
    })
}

function Send-Error($id, [int]$code, $message) {
    Send-Message([ordered]@{
        jsonrpc = "2.0"
        id      = $id
        error   = [ordered]@{ code = $code; message = $message }
    })
}

# Tool failures are reported as results with isError, not JSON-RPC errors,
# so the model can see and react to the message.
function Send-ToolText($id, $text, $isError = $false) {
    Send-Result $id ([ordered]@{
        content = @([ordered]@{ type = "text"; text = "$text" })
        isError = $isError
    })
}

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if ($line.Trim().Length -eq 0) { continue }

    try {
        $request = $line | ConvertFrom-Json
    } catch {
        continue
    }

    switch ($request.method) {
        "initialize" {
            Send-Result $request.id ([ordered]@{
                protocolVersion = "2024-11-05"
                capabilities    = [ordered]@{ tools = [ordered]@{} }
                serverInfo      = [ordered]@{ name = "echo-windows"; version = "1.0.0" }
            })
        }
        "notifications/initialized" {
            # No response required for notifications.
        }
        "tools/list" {
            Send-Result $request.id ([ordered]@{
                tools = @(
                    [ordered]@{
                        name        = "echo"
                        description = "Echoes back the provided message."
                        inputSchema = [ordered]@{
                            type       = "object"
                            properties = [ordered]@{
                                message = [ordered]@{ type = "string" }
                            }
                            required   = @("message")
                        }
                    }
                    [ordered]@{
                        name        = "get_time"
                        description = "Returns the current timestamp in ISO 8601 format."
                        inputSchema = [ordered]@{
                            type       = "object"
                            properties = [ordered]@{
                                utc = [ordered]@{
                                    type        = "boolean"
                                    description = "Return UTC instead of local time. Defaults to false."
                                }
                            }
                            required   = @()
                        }
                    }
                    [ordered]@{
                        name        = "calculate"
                        description = "Performs an arithmetic operation on two numbers."
                        inputSchema = [ordered]@{
                            type       = "object"
                            properties = [ordered]@{
                                operation = [ordered]@{
                                    type        = "string"
                                    enum        = @("add", "subtract", "multiply", "divide", "power", "modulo")
                                    description = "The arithmetic operation to perform."
                                }
                                a         = [ordered]@{ type = "number"; description = "Left operand." }
                                b         = [ordered]@{ type = "number"; description = "Right operand." }
                            }
                            required   = @("operation", "a", "b")
                        }
                    }
                )
            })
        }
        "tools/call" {
            $toolName = $request.params.name
            $toolArgs = $request.params.arguments

            switch ($toolName) {
                "echo" {
                    Send-ToolText $request.id $toolArgs.message
                }
                "get_time" {
                    $now = if ($toolArgs.utc) { [DateTimeOffset]::UtcNow } else { [DateTimeOffset]::Now }
                    # InvariantCulture, or ":" picks up the machine's local time separator.
                    Send-ToolText $request.id $now.ToString("yyyy-MM-ddTHH:mm:sszzz", [cultureinfo]::InvariantCulture)
                }
                "calculate" {
                    $a = $toolArgs.a -as [double]
                    $b = $toolArgs.b -as [double]
                    if ($null -eq $a -or $null -eq $b) {
                        Send-ToolText $request.id "Operands 'a' and 'b' must be numbers." $true
                        break
                    }

                    $value = $null
                    $failure = $null
                    switch ($toolArgs.operation) {
                        "add"      { $value = $a + $b }
                        "subtract" { $value = $a - $b }
                        "multiply" { $value = $a * $b }
                        "power"    { $value = [Math]::Pow($a, $b) }
                        "divide"   {
                            if ($b -eq 0) { $failure = "Division by zero." } else { $value = $a / $b }
                        }
                        "modulo"   {
                            if ($b -eq 0) { $failure = "Modulo by zero." } else { $value = $a % $b }
                        }
                        default    { $failure = "Unknown operation: $($toolArgs.operation)" }
                    }

                    if ($failure) {
                        Send-ToolText $request.id $failure $true
                    } else {
                        # Invariant culture so decimals never come back comma-separated.
                        Send-ToolText $request.id $value.ToString([cultureinfo]::InvariantCulture)
                    }
                }
                default {
                    Send-Error $request.id -32601 "Unknown tool: $toolName"
                }
            }
        }
        default {
            if ($null -ne $request.id) {
                Send-Message([ordered]@{
                    jsonrpc = "2.0"
                    id      = $request.id
                    error   = [ordered]@{ code = -32601; message = "Method not found: $($request.method)" }
                })
            }
        }
    }
}
