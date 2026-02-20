import path from "path"
import { createMemo, createResource, createSignal, onMount, Show } from "solid-js"
import { useSync } from "@tui/context/sync"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useKeybind } from "../context/keybind"
import { useTheme } from "../context/theme"
import { useSDK } from "../context/sdk"
import { useToast } from "../ui/toast"
import { DialogPrompt } from "../ui/dialog-prompt"
import { Locale } from "@/util/locale"

const ADD = "__cert_add__"

function short(value: string) {
  if (value.length <= 12) return value
  return value.slice(0, 12) + "..."
}

function message(error: unknown) {
  if (typeof error === "string") return error
  if (error instanceof Error) return error.message
  if (!error || typeof error !== "object") return "Failed to install certificate"
  if ("message" in error && typeof error.message === "string") return error.message
  if ("data" in error && error.data && typeof error.data === "object") {
    const data = error.data as Record<string, unknown>
    if ("message" in data && typeof data.message === "string") return data.message
  }
  return "Failed to install certificate"
}

export function DialogCert() {
  const dialog = useDialog()
  const keybind = useKeybind()
  const { theme } = useTheme()
  const sdk = useSDK()
  const sync = useSync()
  const toast = useToast()

  const [toDelete, setToDelete] = createSignal<string>()
  const [list, { refetch }] = createResource(async () => {
    const result = await sdk.client.cert.list({}, { throwOnError: true }).catch(() => undefined)
    return result?.data ?? []
  })

  const options = createMemo(() => [
    {
      title: "Add certificate...",
      value: ADD,
      category: "Actions",
      description: "Paste PEM text or enter a certificate path",
    },
    ...(list() ?? []).toSorted((a, b) => b.created_at - a.created_at).map((item) => {
      const deleting = toDelete() === item.fingerprint
      return {
        title: deleting ? `Press ${keybind.print("session_delete")} again to confirm` : item.subject || short(item.fingerprint),
        value: item.fingerprint,
        description: item.issuer,
        category: "Certificates",
        footer: `${Locale.time(item.created_at)} · ${short(item.fingerprint)}`,
        bg: deleting ? theme.error : undefined,
      }
    }),
  ])

  onMount(() => {
    dialog.setSize("large")
  })

  return (
    <DialogSelect
      title="Certificates"
      options={options()}
      onMove={() => {
        setToDelete(undefined)
      }}
      onSelect={(option) => {
        if (option.value !== ADD) return
        dialog.replace(() => <DialogCertAdd />)
      }}
      keybind={[
        {
          keybind: keybind.all.session_delete?.[0],
          title: "delete",
          onTrigger: async (option) => {
            if (option.value === ADD) return
            if (toDelete() === option.value) {
              const result = await sdk.client.cert.remove({ fingerprint: option.value }, { throwOnError: true }).catch(() => undefined)
              if (!result?.data) {
                toast.show({
                  variant: "error",
                  message: "Failed to remove certificate",
                })
                return
              }
              await refetch()
              setToDelete(undefined)
              toast.show({
                variant: "success",
                message: `Removed ${result.data.entry.subject || short(result.data.entry.fingerprint)}`,
              })
              return
            }
            setToDelete(option.value)
          },
        },
      ]}
    />
  )
}

function DialogCertAdd() {
  const dialog = useDialog()
  const { theme } = useTheme()
  const sdk = useSDK()
  const sync = useSync()
  const toast = useToast()
  const [error, setError] = createSignal<string>()
  const [submitting, setSubmitting] = createSignal(false)

  async function install(value: string) {
    const input = value.trim()
    if (!input) return { error: "Enter PEM content or a certificate file path." }
    const inline = input.includes("-----BEGIN CERTIFICATE-----") || input.includes("\n")
    const file = path.isAbsolute(input) ? input : path.resolve(sync.data.path.directory || process.cwd(), input)
    const bytes = inline ? Buffer.from(input) : await Bun.file(file).bytes().catch(() => undefined)
    if (!bytes || bytes.length === 0) {
      if (inline) return { error: "Certificate content is empty or invalid." }
      return { error: `Failed to read certificate file: ${file}` }
    }

    const result = await sdk.client.cert
      .install({
        content: Buffer.from(bytes).toString("base64"),
        encoding: "base64",
      })
      .catch((error) => ({ data: undefined, error }))

    if (!result.data) {
      return { error: message(result.error) }
    }
    return { entry: result.data.entry }
  }

  return (
    <DialogPrompt
      title="Add certificate"
      placeholder="PEM text or /path/to/cert.pem"
      description={() => (
        <box gap={1}>
          <text>Paste PEM content or provide a path to a PEM/DER certificate file.</text>
          <Show when={error()}>
            <text fg={theme.error}>{error()}</text>
          </Show>
        </box>
      )}
      onConfirm={(value) => {
        if (submitting()) return
        setSubmitting(true)
        setError(undefined)
        install(value).then((result) => {
          setSubmitting(false)
          if (!result.entry) {
            setError(result.error || "Failed to install certificate")
            return
          }
          toast.show({
            variant: "success",
            message: `Installed ${result.entry.subject || short(result.entry.fingerprint)}`,
          })
          dialog.replace(() => <DialogCert />)
        })
      }}
      onCancel={() => {
        dialog.replace(() => <DialogCert />)
      }}
    />
  )
}
