import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { ProxyRuntime } from "../../src/proxy/runtime"
import { Global } from "../../src/global"

const file = path.join(Global.Path.state, "command-proxy.json")

async function clean() {
  await fs.rm(file, { force: true })
}

describe("proxy.runtime", () => {
  beforeEach(async () => {
    await clean()
  })

  afterEach(async () => {
    await clean()
  })

  test("persists and reads proxy state", async () => {
    const value = ProxyRuntime.update({
      proxy: "http://proxy.local:8080",
      no: "localhost,127.0.0.1",
    })
    expect(value).toEqual({
      proxy: "http://proxy.local:8080",
      no: "localhost,127.0.0.1",
    })
    expect(ProxyRuntime.get()).toEqual({
      proxy: "http://proxy.local:8080",
      no: "localhost,127.0.0.1",
    })

    const json = await Bun.file(file).json()
    expect(json).toEqual({
      proxy: "http://proxy.local:8080",
      no: "localhost,127.0.0.1",
    })
  })

  test("patches fields without replacing unspecified keys", () => {
    ProxyRuntime.update({
      proxy: "http://proxy.local:8080",
      no: "localhost",
    })
    const value = ProxyRuntime.update({
      no: "127.0.0.1",
    })
    expect(value).toEqual({
      proxy: "http://proxy.local:8080",
      no: "127.0.0.1",
    })
  })

  test("clears persisted state when both fields are removed", async () => {
    ProxyRuntime.update({
      proxy: "http://proxy.local:8080",
      no: "localhost",
    })
    const value = ProxyRuntime.update({
      proxy: null,
      no: null,
    })
    expect(value).toEqual({
      proxy: undefined,
      no: undefined,
    })
    expect(ProxyRuntime.get()).toEqual({
      proxy: undefined,
      no: undefined,
    })
    expect(await Bun.file(file).exists()).toBe(false)
  })

  test("ignores malformed persisted data", async () => {
    await Bun.write(file, "{not-json")
    expect(ProxyRuntime.get()).toEqual({
      proxy: undefined,
      no: undefined,
    })
  })
})
