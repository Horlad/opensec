import { CertRuntime } from "@/cert/runtime"
import { lazy } from "@/util/lazy"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { errors } from "../error"

const CertEntry = z
  .object({
    fingerprint: z.string(),
    pem: z.string(),
    subject: z.string(),
    issuer: z.string(),
    created_at: z.number(),
  })
  .meta({
    ref: "CommandCertificate",
  })

const CertRuntimeInfo = z
  .object({
    mode: z.enum(["macos-host", "kali-container", "linux-host"]),
    applied: z.boolean(),
  })
  .meta({
    ref: "CommandCertificateRuntime",
  })

const CertInstall = z
  .object({
    content: z.string().min(1),
    encoding: z.enum(["base64", "utf8"]).optional(),
  })
  .strict()

const CertResult = z
  .object({
    entry: CertEntry,
    runtime: CertRuntimeInfo,
  })
  .meta({
    ref: "CommandCertificateResult",
  })

function decode(input: z.infer<typeof CertInstall>) {
  if (input.encoding === "utf8") return Buffer.from(input.content)
  const value = input.content.replace(/\s+/g, "")
  const bytes = Buffer.from(value, "base64")
  if (bytes.length === 0) return
  const normalized = bytes.toString("base64").replace(/=+$/g, "")
  if (normalized !== value.replace(/=+$/g, "")) return
  return bytes
}

export const CertRoutes = lazy(() =>
  new Hono()
    .get(
      "/",
      describeRoute({
        summary: "List managed command certificates",
        description: "List certificates managed by /cert.",
        operationId: "cert.list",
        responses: {
          200: {
            description: "Managed certificates",
            content: {
              "application/json": {
                schema: resolver(z.array(CertEntry)),
              },
            },
          },
        },
      }),
      async (c) => {
        return c.json(await CertRuntime.list())
      },
    )
    .post(
      "/",
      describeRoute({
        summary: "Install and persist command certificate",
        description: "Install a CA certificate into the system trust store and persist it for /cert management.",
        operationId: "cert.install",
        responses: {
          200: {
            description: "Installed certificate",
            content: {
              "application/json": {
                schema: resolver(CertResult),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", CertInstall),
      async (c) => {
        const body = c.req.valid("json")
        const bytes = decode(body)
        if (!bytes) throw new HTTPException(400, { message: "Invalid certificate content encoding" })
        const result = await CertRuntime.install(bytes).catch((error) => {
          const message = error instanceof Error ? error.message : String(error)
          throw new HTTPException(400, { message })
        })
        return c.json(result)
      },
    )
    .delete(
      "/:fingerprint",
      describeRoute({
        summary: "Remove managed command certificate",
        description: "Remove a managed certificate from system trust store and persisted /cert state.",
        operationId: "cert.remove",
        responses: {
          200: {
            description: "Removed certificate",
            content: {
              "application/json": {
                schema: resolver(CertResult),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator(
        "param",
        z.object({
          fingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
        }),
      ),
      async (c) => {
        const fingerprint = c.req.valid("param").fingerprint.toLowerCase()
        const result = await CertRuntime.remove(fingerprint).catch((error) => {
          const message = error instanceof Error ? error.message : String(error)
          if (message.includes("is not managed")) throw new HTTPException(404, { message })
          throw new HTTPException(400, { message })
        })
        return c.json(result)
      },
    ),
)
