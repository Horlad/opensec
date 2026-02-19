import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { errors } from "../error"
import { lazy } from "@/util/lazy"
import { ProxyRuntime } from "@/proxy/runtime"

const ProxyState = z
  .object({
    proxy: z.string().optional(),
    no: z.string().optional(),
  })
  .meta({
    ref: "CommandProxy",
  })

const ProxyUpdate = z
  .object({
    proxy: z.string().nullable().optional(),
    no: z.string().nullable().optional(),
  })
  .strict()

export const ProxyRoutes = lazy(() =>
  new Hono()
    .get(
      "/",
      describeRoute({
        summary: "Get command proxy configuration",
        description: "Retrieve the current command proxy configuration managed by /proxy.",
        operationId: "proxy.get",
        responses: {
          200: {
            description: "Current command proxy configuration",
            content: {
              "application/json": {
                schema: resolver(ProxyState),
              },
            },
          },
        },
      }),
      async (c) => {
        return c.json(ProxyRuntime.get())
      },
    )
    .patch(
      "/",
      describeRoute({
        summary: "Update command proxy configuration",
        description: "Update command proxy configuration managed by /proxy.",
        operationId: "proxy.update",
        responses: {
          200: {
            description: "Updated command proxy configuration",
            content: {
              "application/json": {
                schema: resolver(ProxyState),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", ProxyUpdate),
      async (c) => {
        return c.json(ProxyRuntime.update(c.req.valid("json")))
      },
    ),
)
