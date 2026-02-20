import { describe, expect, test } from "bun:test"
import { CertCommand } from "../../../src/cli/cmd/tui/component/prompt/cert-command"

describe("cert-command parser", () => {
  test("parses open command", () => {
    expect(CertCommand.parse("/cert")).toEqual({ type: "open" })
    expect(CertCommand.parse("/certs")).toEqual({ type: "open" })
  })

  test("parses multiline PEM install", () => {
    expect(
      CertCommand.parse(`/cert
-----BEGIN CERTIFICATE-----
MIIB
-----END CERTIFICATE-----`),
    ).toEqual({
      type: "install_content",
      content: `-----BEGIN CERTIFICATE-----
MIIB
-----END CERTIFICATE-----`,
    })
  })

  test("parses @file install", () => {
    expect(CertCommand.parse("/cert @ca.pem")).toEqual({
      type: "install_part",
      selector: "@ca.pem",
    })
  })

  test("parses path install", () => {
    expect(CertCommand.parse("/cert ./certs/ca.pem")).toEqual({
      type: "install_path",
      path: "./certs/ca.pem",
    })
    expect(CertCommand.parse("/cert /tmp/ca.der")).toEqual({
      type: "install_path",
      path: "/tmp/ca.der",
    })
  })

  test("rejects invalid usage", () => {
    expect(
      CertCommand.parse(`/cert ./ca.pem
-----BEGIN CERTIFICATE-----
MIIB
-----END CERTIFICATE-----`),
    ).toEqual({
      type: "invalid",
      message: "Usage: /cert [@file|/path/to/cert.pem|/path/to/cert.der] or paste PEM on new lines",
    })

    expect(CertCommand.parse("/cert @ca pem")).toEqual({
      type: "invalid",
      message: "Usage: /cert [@file|/path/to/cert.pem|/path/to/cert.der] or paste PEM on new lines",
    })
  })

  test("ignores non cert commands", () => {
    expect(CertCommand.parse("hello")).toBeUndefined()
    expect(CertCommand.parse("/proxy")).toBeUndefined()
  })
})
