import { Global } from "@/global"
import fs from "fs"
import path from "path"

type State = {
  proxy?: string
  no?: string
}

type Update = {
  proxy?: string | null
  no?: string | null
}

const file = process.env.OPENCODE_COMMAND_PROXY_STATE_FILE || path.join(Global.Path.state, "command-proxy.json")

function clean(value: string | null | undefined) {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function valid(value: unknown): State {
  if (!value || typeof value !== "object") return {}
  const input = value as Record<string, unknown>
  return {
    proxy: clean(typeof input.proxy === "string" ? input.proxy : undefined),
    no: clean(typeof input.no === "string" ? input.no : undefined),
  }
}

function read() {
  if (!fs.existsSync(file)) return {}
  try {
    return valid(JSON.parse(fs.readFileSync(file, "utf8")))
  } catch {
    return {}
  }
}

function write(value: State) {
  if (!value.proxy && !value.no) {
    fs.rmSync(file, { force: true })
    return
  }
  fs.writeFileSync(file, JSON.stringify(value, null, 2))
}

export namespace ProxyRuntime {
  export type Value = State
  export type Input = Update

  export function init() {
    read()
  }

  export function get() {
    return read()
  }

  export function update(input: Input) {
    const prev = read()
    const next = {
      proxy: input.proxy === undefined ? prev.proxy : clean(input.proxy),
      no: input.no === undefined ? prev.no : clean(input.no),
    }
    write(next)
    return next
  }
}
