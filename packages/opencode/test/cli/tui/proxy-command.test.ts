import { describe, expect, test } from "bun:test"
import { ProxyCommand } from "../../../src/cli/cmd/tui/component/prompt/proxy-command"

describe("proxy-command parser", () => {
  test("parses show", () => {
    expect(ProxyCommand.parse("/proxy")).toEqual({ type: "show" })
  })

  test("parses direct set", () => {
    expect(ProxyCommand.parse("/proxy http://127.0.0.1:8080")).toEqual({
      type: "set",
      proxy: "http://127.0.0.1:8080",
    })
  })

  test("parses set form", () => {
    expect(ProxyCommand.parse("/proxy set socks5://127.0.0.1:1080")).toEqual({
      type: "set",
      proxy: "socks5://127.0.0.1:1080",
    })
  })

  test("parses off aliases", () => {
    expect(ProxyCommand.parse("/proxy off")).toEqual({ type: "off" })
    expect(ProxyCommand.parse("/proxy clear")).toEqual({ type: "off" })
  })

  test("parses no and no clear", () => {
    expect(ProxyCommand.parse("/proxy no localhost,127.0.0.1")).toEqual({
      type: "set_no",
      no: "localhost,127.0.0.1",
    })
    expect(ProxyCommand.parse("/proxy no off")).toEqual({ type: "clear_no" })
    expect(ProxyCommand.parse("/proxy no clear")).toEqual({ type: "clear_no" })
  })

  test("rejects invalid inputs", () => {
    expect(ProxyCommand.parse("/proxy ftp://")).toEqual({
      type: "invalid",
      message: "Usage: /proxy [set <url>|off|clear|no <hosts>|no off]",
    })
    expect(ProxyCommand.parse("/proxy set")).toEqual({
      type: "invalid",
      message: "Usage: /proxy set <url>",
    })
    expect(ProxyCommand.parse("/proxy no")).toEqual({
      type: "invalid",
      message: "Usage: /proxy no <hosts>",
    })
  })
})
