import { ProxyRuntime } from "@/proxy/runtime"

export namespace CommandEnv {
  export function values() {
    const value = ProxyRuntime.get()
    const proxy = value.proxy
    return {
      http: proxy,
      https: proxy,
      all: proxy,
      no: value.no,
    }
  }

  export function shell() {
    const value = values()
    const env = {} as Record<string, string>
    if (value.http) {
      env.HTTP_PROXY = value.http
      env.http_proxy = value.http
    }
    if (value.https) {
      env.HTTPS_PROXY = value.https
      env.https_proxy = value.https
    }
    if (value.all) {
      env.ALL_PROXY = value.all
      env.all_proxy = value.all
    }
    if (value.no) {
      env.NO_PROXY = value.no
      env.no_proxy = value.no
    }
    return env
  }
}
