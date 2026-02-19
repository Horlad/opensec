export namespace ProxyCommand {
  export type Parsed =
    | {
        type: "show"
      }
    | {
        type: "set"
        proxy: string
      }
    | {
        type: "off"
      }
    | {
        type: "set_no"
        no: string
      }
    | {
        type: "clear_no"
      }
    | {
        type: "invalid"
        message: string
      }

  function url(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    try {
      const parsed = new URL(trimmed)
      if (!parsed.protocol || !parsed.hostname) return
      return trimmed
    } catch {
      return
    }
  }

  export function parse(input: string): Parsed | undefined {
    const line = input.trim().split("\n")[0]?.trim()
    if (!line) return
    if (!line.startsWith("/")) return
    const [name, ...rest] = line.split(/\s+/)
    if (name !== "/proxy") return
    if (rest.length === 0) return { type: "show" }
    if (rest[0] === "off" || rest[0] === "clear") return { type: "off" }
    if (rest[0] === "set") {
      const value = url(rest.slice(1).join(" "))
      if (value) return { type: "set", proxy: value }
      return { type: "invalid", message: "Usage: /proxy set <url>" }
    }
    if (rest[0] === "no") {
      const value = rest.slice(1).join(" ").trim()
      if (!value) return { type: "invalid", message: "Usage: /proxy no <hosts>" }
      if (value === "off" || value === "clear") return { type: "clear_no" }
      return { type: "set_no", no: value }
    }
    const value = url(rest.join(" "))
    if (value) return { type: "set", proxy: value }
    return { type: "invalid", message: "Usage: /proxy [set <url>|off|clear|no <hosts>|no off]" }
  }
}
