export namespace CertCommand {
  const USAGE = "Usage: /cert [@file|/path/to/cert.pem|/path/to/cert.der] or paste PEM on new lines"

  export type Parsed =
    | {
        type: "open"
      }
    | {
        type: "install_content"
        content: string
      }
    | {
        type: "install_part"
        selector: string
      }
    | {
        type: "install_path"
        path: string
      }
    | {
        type: "invalid"
        message: string
      }

  export function parse(input: string): Parsed | undefined {
    const firstLineEnd = input.indexOf("\n")
    const firstLine = (firstLineEnd === -1 ? input : input.slice(0, firstLineEnd)).trim()
    if (!firstLine.startsWith("/")) return

    const [name, ...rest] = firstLine.split(/\s+/)
    if (name !== "/cert" && name !== "/certs") return

    const arg = rest.join(" ").trim()
    const body = (firstLineEnd === -1 ? "" : input.slice(firstLineEnd + 1)).trim()

    if (!arg && !body) return { type: "open" }
    if (!arg && body) return { type: "install_content", content: body }
    if (arg && body) return { type: "invalid", message: USAGE }
    if (!arg) return { type: "invalid", message: USAGE }
    if (arg.startsWith("@")) {
      if (arg.includes(" ")) return { type: "invalid", message: USAGE }
      return { type: "install_part", selector: arg }
    }
    return { type: "install_path", path: arg }
  }
}
