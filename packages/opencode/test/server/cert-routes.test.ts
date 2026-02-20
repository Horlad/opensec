import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { Server } from "../../src/server/server"
import { Log } from "../../src/util/log"

Log.init({ print: false })

const CA_PEM = `-----BEGIN CERTIFICATE-----
MIIDFzCCAf+gAwIBAgIUISYQgb0tKlbAymX+lqceEKf6+NYwDQYJKoZIhvcNAQEL
BQAwGzEZMBcGA1UEAwwQT3BlbkNvZGUgVGVzdCBDQTAeFw0yNjAyMjAwOTA3MDFa
Fw0yNzAyMjAwOTA3MDFaMBsxGTAXBgNVBAMMEE9wZW5Db2RlIFRlc3QgQ0EwggEi
MA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDRAsThN2PvU/SXTiJzZpFYFUKJ
QcBo4jZQC+GN1ipiSGrS0OBDwIFARfqRsLQmTPGY4f40AtDGXO2+UzZnflrLrNSj
QplVMIX7AUR1MLjg8dVoOjmfOfsjTaOyiq0G/Bez+8AAdMre8728j4gdISMw0Fbz
OB6Bh7WTl5K6xC9zJZvOenELLTwRDqIBHj+rmEP7dDn64E7tWLOi2VSdG0jOOa+Y
Dw4rJ7IFG3jKh/xeI22OXxc+ysB0PJ8SoNwkKsRHLDU+oEdtVrFQH9+E6MGKjgpG
JBv5oND+0BHcBkcR4OoLMC2kyab6TbI6PY+EUNEgiTxFwxzUJMDphT7bIe5rAgMB
AAGjUzBRMB0GA1UdDgQWBBQAzvfx/iFiQEQ/AEHEuPCVMTuJsTAfBgNVHSMEGDAW
gBQAzvfx/iFiQEQ/AEHEuPCVMTuJsTAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3
DQEBCwUAA4IBAQB2wXrZCQ0EiHq9yGDRB9mosc4rLyLH+jHTiXOS5d3jiei8pexl
PDrDTbR0uG0zXxjEZJ8pwk5cSJWeDDNIgjoTidA4Th3Hwr+mCjUknxD2Ziv+rj0A
Rn6tEvFQxbdHXB1kE7kjoSHMBOmKpoTfFDev7V7kaqD0YSSTzfIs+A/xxliuYpDk
eYkz1WaSVwi5kwekDtbd3E9e9gstR8IrJ8vPaHVd/vvcs1t5MDKajATMElaFnwkS
4g6I31QeAzAiC8vlvsXJKlLlic8GrbrWJVUNI8QTfV1ewKGLVZEJvJS5jl9BrfdU
Naj4e1BsuDSJ7bgNvP4gD7NUKqCLi5ojuO8Z
-----END CERTIFICATE-----`

const LEAF_PEM = `-----BEGIN CERTIFICATE-----
MIIDDjCCAfagAwIBAgIUfg6Q6CfB1iBFoneQ67nuATZKh4YwDQYJKoZIhvcNAQEL
BQAwGDEWMBQGA1UEAwwNT3BlbkNvZGUgTGVhZjAeFw0yNjAyMjAwOTA3MDFaFw0y
NzAyMjAwOTA3MDFaMBgxFjAUBgNVBAMMDU9wZW5Db2RlIExlYWYwggEiMA0GCSqG
SIb3DQEBAQUAA4IBDwAwggEKAoIBAQCy2hmrXgO3jQmctp1efrFCeLBmgj1ZaLNb
utSpPCi6JZy+4vNfwT7pWK/oMzYJiNpLoRp3nzlNnRMHTwE/BqlvhPhNq+YJuYnw
0CghOX7mOqGfMfYJ4E1RoAN2oYn4Pr1eZy+3pYmxySHw7bmwll4zudgVtb8ySkpz
67v1QNpGHcjQAm4+CycnTiZFfPJAflUjxdiV4Hlwbsi/JuKgdnPPSOMIxNUzPY71
Z18G7a1tgK9i48LZcZmmeJZ2+Xc7HOG3DWAl3zze2ZEpxKpnuXl2NlqOzpeCB5JV
9S5O7zQ9ZZC6YcNpAmth0kctgmjNr8ETiOGlpA+uSjbJbpjfLq8TAgMBAAGjUDBO
MB0GA1UdDgQWBBQXfNCzBSH0D0UVIY6KGbKcE+bmDDAfBgNVHSMEGDAWgBQXfNCz
BSH0D0UVIY6KGbKcE+bmDDAMBgNVHRMBAf8EAjAAMA0GCSqGSIb3DQEBCwUAA4IB
AQCi6dxD/kHJLSFER/0AxDBVNWojvGZfGJEJraGWbfZetL1Mk/M0qobMiYmGjK6T
5Nzzq6giffnXi+Bn36+iNHAfpyylTS0HnEfNCgRHCUplFpM+vedv3K4vc4Rm1Ab8
xW/UeAwLdwud+8jMDyjR/RFjWq2MIUVUBpjqXP1ZUhFwRwE4VBPPFnxpK3n86nDt
JzLCTcTrneiCoBaXMmXUBOa/Z1zEc2gROdQQwsFXtvIjp886uWRT26KmoQlMI+3s
D40DhDAzX+LnF8J6ozs+MwpS7e4ZbJd3tX26wGHlIzUb+aCANMpFJoyHO6Pe+2uY
5htG7iUpyvWEWzLsUcR6Zhvl
-----END CERTIFICATE-----`

const prevState = process.env.OPENCODE_COMMAND_CERT_STATE_FILE
const prevSkip = process.env.OPENCODE_COMMAND_CERT_SKIP_TRUST
const file = path.join(os.tmpdir(), `opencode-cert-routes-${process.pid}.json`)

describe("cert routes", () => {
  beforeEach(async () => {
    process.env.OPENCODE_COMMAND_CERT_STATE_FILE = file
    process.env.OPENCODE_COMMAND_CERT_SKIP_TRUST = "1"
    await fs.rm(file, { force: true })
  })

  afterEach(async () => {
    await fs.rm(file, { force: true })
    if (prevState === undefined) delete process.env.OPENCODE_COMMAND_CERT_STATE_FILE
    if (prevState !== undefined) process.env.OPENCODE_COMMAND_CERT_STATE_FILE = prevState
    if (prevSkip === undefined) delete process.env.OPENCODE_COMMAND_CERT_SKIP_TRUST
    if (prevSkip !== undefined) process.env.OPENCODE_COMMAND_CERT_SKIP_TRUST = prevSkip
  })

  test("lists managed certificates", async () => {
    const app = Server.App()
    const created = await app.request("/cert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: Buffer.from(CA_PEM).toString("base64"),
        encoding: "base64",
      }),
    })

    expect(created.status).toBe(200)

    const listed = await app.request("/cert")
    expect(listed.status).toBe(200)

    const body = await listed.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(1)
    expect(body[0]).toMatchObject({
      fingerprint: expect.any(String),
      pem: expect.any(String),
      subject: expect.any(String),
      issuer: expect.any(String),
      created_at: expect.any(Number),
    })
  })

  test("returns 400 for invalid content encoding", async () => {
    const app = Server.App()
    const response = await app.request("/cert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "*",
        encoding: "base64",
      }),
    })
    expect(response.status).toBe(400)
  })

  test("returns 400 for non-CA certificate", async () => {
    const app = Server.App()
    const response = await app.request("/cert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: Buffer.from(LEAF_PEM).toString("base64"),
        encoding: "base64",
      }),
    })
    expect(response.status).toBe(400)
  })

  test("returns 404 on removing unknown fingerprint", async () => {
    const app = Server.App()
    const response = await app.request(`/cert/${"a".repeat(64)}`, {
      method: "DELETE",
    })
    expect(response.status).toBe(404)
  })
})
