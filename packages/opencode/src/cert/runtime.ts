import { Global } from "@/global"
import { Log } from "@/util/log"
import { createHash, X509Certificate } from "crypto"
import fs from "fs"
import fsp from "fs/promises"
import os from "os"
import path from "path"

const log = Log.create({ service: "cert.runtime" })

type Entry = {
  fingerprint: string
  pem: string
  subject: string
  issuer: string
  created_at: number
}

type Runtime = {
  mode: "macos-host" | "kali-container" | "linux-host"
  applied: boolean
}

const CERT_PATH = "/usr/local/share/ca-certificates"

function state() {
  return process.env.OPENCODE_COMMAND_CERT_STATE_FILE || path.join(Global.Path.state, "command-cert.json")
}

function mode(): Runtime["mode"] {
  if (process.platform === "darwin") return "macos-host"
  if (process.env.OPENCODE_APPLE_CONTAINER === "1") return "kali-container"
  return "linux-host"
}

function skipped() {
  return process.env.OPENCODE_COMMAND_CERT_SKIP_TRUST === "1"
}

function canonical(raw: Buffer | Uint8Array) {
  const base64 = Buffer.from(raw).toString("base64")
  const lines = base64.match(/.{1,64}/g)?.join("\n") ?? base64
  return `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----\n`
}

function normalize(input: Buffer | Uint8Array | ArrayBuffer | string) {
  const data =
    typeof input === "string"
      ? Buffer.from(input)
      : input instanceof ArrayBuffer
        ? Buffer.from(new Uint8Array(input))
        : Buffer.from(input)
  const text = data.toString("utf8")
  const pem = text.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)
  const cert = new X509Certificate(pem?.[0] ?? data)
  if (!cert.ca) throw new Error("Certificate is not a CA certificate")
  const raw = Buffer.from(cert.raw)
  return {
    fingerprint: createHash("sha256").update(raw).digest("hex"),
    pem: canonical(raw),
    subject: cert.subject,
    issuer: cert.issuer,
  }
}

function valid(value: unknown): Entry[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Entry => {
      if (!item || typeof item !== "object") return false
      const cert = item as Record<string, unknown>
      return (
        typeof cert.fingerprint === "string" &&
        typeof cert.pem === "string" &&
        typeof cert.subject === "string" &&
        typeof cert.issuer === "string" &&
        typeof cert.created_at === "number"
      )
    })
    .filter((item, index, list) => list.findIndex((other) => other.fingerprint === item.fingerprint) === index)
}

function read() {
  const file = state()
  if (!fs.existsSync(file)) return [] as Entry[]
  return Bun.file(file)
    .json()
    .then(valid)
    .catch(() => [] as Entry[])
}

async function write(list: Entry[]) {
  const file = state()
  if (list.length === 0) {
    await fsp.rm(file, { force: true })
    return
  }
  await fsp.mkdir(path.dirname(file), { recursive: true })
  await Bun.write(file, JSON.stringify(list, null, 2))
}

function quote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function applescript(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

async function exec(cmd: string[]) {
  const proc = Bun.spawn({
    cmd,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [code, out, err] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  const output = [out.trim(), err.trim()].filter(Boolean).join("\n")
  if (code === 0) return output
  throw new Error(output || `Command failed: ${cmd.join(" ")}`)
}

async function temp(pem: string, fn: (file: string) => Promise<void>) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "opencode-cert-"))
  const file = path.join(dir, "cert.pem")
  await Bun.write(file, pem)
  return fn(file).finally(() => fsp.rm(dir, { recursive: true, force: true }))
}

async function sudo(command: string) {
  await exec(["osascript", "-e", `do shell script "${applescript(command)}" with administrator privileges`])
}

function certfile(fingerprint: string) {
  return path.join(CERT_PATH, `opencode-${fingerprint}.crt`)
}

async function refresh() {
  if (!Bun.which("update-ca-certificates")) {
    throw new Error("`update-ca-certificates` was not found in this runtime")
  }
  await exec(["update-ca-certificates"])
}

async function installSystem(entry: Entry): Promise<Runtime> {
  const info = {
    mode: mode(),
    applied: false,
  } satisfies Runtime
  if (skipped()) return info
  if (process.platform === "darwin") {
    await temp(entry.pem, (file) =>
      sudo(`security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${quote(file)}`),
    )
    return {
      ...info,
      applied: true,
    }
  }
  if (process.platform === "linux") {
    await Bun.write(certfile(entry.fingerprint), entry.pem)
    await refresh()
    return {
      ...info,
      applied: true,
    }
  }
  throw new Error(`Certificate install is not supported on ${process.platform}`)
}

async function removeSystem(entry: Entry): Promise<Runtime> {
  const info = {
    mode: mode(),
    applied: false,
  } satisfies Runtime
  if (skipped()) return info
  if (process.platform === "darwin") {
    await temp(entry.pem, (file) => sudo(`security remove-trusted-cert -d ${quote(file)}`))
    return {
      ...info,
      applied: true,
    }
  }
  if (process.platform === "linux") {
    await fsp.rm(certfile(entry.fingerprint), { force: true })
    await refresh()
    return {
      ...info,
      applied: true,
    }
  }
  throw new Error(`Certificate removal is not supported on ${process.platform}`)
}

export namespace CertRuntime {
  export type Value = Entry
  export type Info = Runtime

  export async function init() {
    if (process.env.OPENCODE_APPLE_CONTAINER !== "1") return
    const result = await reapply().catch((error) => {
      log.error("failed to reapply managed certificates", { error })
      return undefined
    })
    if (!result) return
    if (result.failed > 0) {
      log.warn("some managed certificates failed to reapply", result)
    }
  }

  export async function list() {
    const value = await read()
    return value.toSorted((a, b) => b.created_at - a.created_at)
  }

  export async function install(input: Buffer | Uint8Array | ArrayBuffer | string) {
    const next = normalize(input)
    const prev = await read()
    const existing = prev.find((item) => item.fingerprint === next.fingerprint)
    if (existing) {
      return {
        entry: existing,
        runtime: {
          mode: mode(),
          applied: false,
        } satisfies Runtime,
      }
    }

    const entry = {
      ...next,
      created_at: Date.now(),
    } satisfies Entry

    const runtime = await installSystem(entry)
    await write([...prev, entry])
    return { entry, runtime }
  }

  export async function remove(fingerprint: string) {
    const list = await read()
    const entry = list.find((item) => item.fingerprint === fingerprint)
    if (!entry) throw new Error(`Certificate ${fingerprint} is not managed by opencode`)
    const runtime = await removeSystem(entry)
    await write(list.filter((item) => item.fingerprint !== fingerprint))
    return { entry, runtime }
  }

  export async function reapply() {
    const list = await read()
    const result = {
      applied: 0,
      failed: 0,
    }
    for (const item of list) {
      const runtime = await installSystem(item).catch((error) => {
        log.error("failed to install managed certificate", {
          fingerprint: item.fingerprint,
          error,
        })
        result.failed += 1
        return undefined
      })
      if (runtime?.applied) result.applied += 1
    }
    return result
  }
}
