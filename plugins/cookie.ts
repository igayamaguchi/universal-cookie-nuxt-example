import { OutgoingMessage } from 'http'
import { serialize } from 'cookie'
import { Plugin } from '@nuxt/types'
import UniversalCookie, { CookieChangeOptions } from 'universal-cookie'

declare module 'vue/types/vue' {
  interface Vue {
    $cookie: UniversalCookie
  }
}

declare module '@nuxt/types' {
  interface NuxtAppOptions {
    $cookie: UniversalCookie
  }
}

declare module 'vuex/types/index' {
  interface Store<S> {
    $cookie: UniversalCookie
  }
}

/**
 * Vueでthis.$cookieからクッキーの操作を行える処理を追加する
 * サーバー、クライアント両方で同じインターフェースで扱えるように
 * @param req
 * @param res
 * @param inject
 */
const plugin: Plugin = ({ req, res }, inject) => {
  let cookie: UniversalCookie

  if (process.server) {
    cookie = createServerCookie(req.headers.cookie || '', res)
  } else {
    cookie = new UniversalCookie()
  }

  inject('cookie', cookie)
}

/**
 * universal-cookieはサーバーでcookieを追加、変更、削除する場合、それをクライアントに知らせる仕組みがない
 * そのため自前でレスポンスヘッダーにSet-Cookieヘッダーを追加してクッキーの情報をクライアントに送る必要がある
 * その仕組みを備えたインスタンスを生成する
 */
export function createServerCookie(
  cookie: string,
  res: OutgoingMessage
): UniversalCookie {
  const universalCookie = new UniversalCookie(cookie)
  universalCookie.addChangeListener((change: CookieChangeOptions) => {
    if (res.headersSent) {
      return
    }
    let cookieHeader = res.getHeader('Set-Cookie')
    if (typeof cookieHeader === 'string') {
      cookieHeader = [cookieHeader]
    } else if (typeof cookieHeader === 'number') {
      cookieHeader = [cookieHeader.toString()]
    }
    cookieHeader = (cookieHeader as string[]) || []

    // cookieの削除時にはvalueにundefinedが入る
    if (change.value === undefined) {
      cookieHeader.push(serialize(change.name, '', change.options))
    } else {
      cookieHeader.push(serialize(change.name, change.value, change.options))
    }

    res.setHeader('Set-Cookie', cookieHeader)
  })

  return universalCookie
}

export default plugin
