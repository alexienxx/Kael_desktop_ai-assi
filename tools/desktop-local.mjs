import { createServer, request } from 'node:http'
import { createReadStream, existsSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

// The launcher supplies the canonical credential to this process only.
// The private launch URL holds a separate, expiring capability limited to chat.
const backendKey = process.env.KAEL_API_KEY
const session = process.env.ARRAKIS_DESKTOP_SESSION
const linkFile = process.env.ARRAKIS_DESKTOP_PRIVATE_LINK_FILE
if (!backendKey || !session || !linkFile) throw new Error('Missing local session launch configuration')
const access = randomBytes(32).toString('hex')
const port = 5011
const origin = 'http://127.0.0.1:' + port
const prefix = '/bridge/' + access
const dist = fileURLToPath(new URL('../desktop-local-dist/', import.meta.url))
if (!existsSync(join(dist, 'index.html'))) throw new Error('Build the desktop-local profile first')
const routes = new Set([
  'GET /health', 'GET /chat/history/messages', 'GET /chat/history/pending',
  'GET /chat/context/recent', 'GET /chat/events', 'POST /chat/events/token', 'POST /chat',
])
const types = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html', '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2' }
const server = createServer(async (req, res) => {
  const reject = (status) => { res.writeHead(status); res.end() }
  if (req.headers.host !== '127.0.0.1:' + port || (req.headers.origin && req.headers.origin !== origin)) return reject(403)
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
  let url
  try { url = new URL(req.url, origin) } catch { return reject(400) }
  if (url.origin !== origin) return reject(403)
  if (!url.pathname.startsWith(prefix + '/')) {
    if (req.method !== 'GET') return reject(405)
    const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1)
    if (!(name === 'index.html' || name === 'arrakis-logo.png' || /^assets\/[\w.-]+$/.test(name))) return reject(404)
    const file = join(dist, name)
    if (!existsSync(file)) return reject(404)
    res.setHeader('Content-Type', types[extname(name)] ?? 'application/octet-stream')
    return createReadStream(file).on('error', () => res.destroy()).pipe(res)
  }
  if (req.headers['sec-fetch-site'] !== 'same-origin') return reject(403)
  const path = url.pathname.slice(prefix.length)
  if (!routes.has(req.method + ' ' + path)) return reject(404)
  let payload
  if (req.method === 'POST') {
    if (req.headers.origin !== origin || !req.headers['content-type']?.startsWith('application/json')) return reject(403)
    const chunks = []
    let size = 0
    try {
      for await (const chunk of req) {
        size += chunk.length
        if (size > 256 * 1024) return reject(413)
        chunks.push(chunk)
      }
      payload = Buffer.concat(chunks)
      const body = JSON.parse(payload)
      if ((path === '/chat' ? body.session_id : body.conversation_id) !== session) return reject(403)
    } catch { return reject(400) }
  }
  if ((path.startsWith('/chat/history/') || path === '/chat/context/recent') &&
      (url.searchParams.getAll('session_id').length !== 1 || url.searchParams.get('session_id') !== session)) return reject(403)
  const upstream = request({hostname:'127.0.0.1', port:8002, path:path + url.search, method:req.method,
    headers:{'X-KAEL-KEY':backendKey, ...(payload ? {'Content-Type':'application/json', 'Content-Length':payload.length} : {})}},
    response => {
      res.writeHead(response.statusCode, {'Content-Type':response.headers['content-type'] ?? 'application/json'})
      response.on('error', () => res.destroy()).pipe(res)
    })
  upstream.on('error', () => { if (!res.headersSent) reject(502); else res.destroy() })
  res.on('close', () => upstream.destroy())
  upstream.end(payload)
})
server.listen(port, '127.0.0.1', () => {
  const params = new URLSearchParams({access, session})
  try { writeFileSync(linkFile, origin + '/#' + params, {flag:'wx',mode:0o600}) }
  catch { server.close(); throw new Error('Private launch link already exists or is unavailable') }
})
// An unattended test bridge should not keep privileged access open indefinitely.
setTimeout(() => { server.closeAllConnections(); server.close() }, 2 * 60 * 60 * 1000).unref()
