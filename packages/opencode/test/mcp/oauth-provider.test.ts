import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { McpOAuthProvider } from "../../src/mcp/oauth-provider"

const KEY = "OPENCODE_MCP_OAUTH_CALLBACK_PORT"
let previous = process.env[KEY]

function provider() {
  return new McpOAuthProvider("demo", "https://example.com/mcp", {}, { onRedirect: async () => {} })
}

describe("McpOAuthProvider.redirectUrl", () => {
  beforeEach(() => {
    previous = process.env[KEY]
  })

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[KEY]
      return
    }
    process.env[KEY] = previous
  })

  test("uses default callback port", () => {
    delete process.env[KEY]
    expect(provider().redirectUrl).toBe("http://127.0.0.1:19876/mcp/oauth/callback")
  })

  test("uses configured callback port", () => {
    process.env[KEY] = "29876"
    expect(provider().redirectUrl).toBe("http://127.0.0.1:29876/mcp/oauth/callback")
  })

  test("ignores invalid callback port", () => {
    process.env[KEY] = "invalid"
    expect(provider().redirectUrl).toBe("http://127.0.0.1:19876/mcp/oauth/callback")
  })
})
