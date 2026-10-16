/**
 * Serves the exported web build in example/dist and answers Apple's form_post request, so both
 * web sign-in modes can run behind an HTTPS tunnel.
 */
import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleAppleWebRedirect } from 'expo-apple-sign-in/server'

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const host = '127.0.0.1'
const port = Number(process.env.PORT ?? 43181)

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
}

if (!existsSync(join(root, 'index.html'))) {
  console.error('example/dist is missing. Run npm run web:export first.')
  process.exit(1)
}

function toHeaders(nodeHeaders) {
  const headers = new Headers()
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item)
      }
    } else if (value !== undefined) {
      headers.set(name, value)
    }
  }

  return headers
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

function resolveFile(pathname) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return join(root, 'index.html')
  }
  const target = resolve(join(root, decoded))
  const inside = target === root || target.startsWith(root + sep)
  if (inside && existsSync(target) && statSync(target).isFile()) {
    return target
  }

  return join(root, 'index.html')
}

async function handle(req, res, pathname) {
  if (req.method === 'POST') {
    const body = await readBody(req)
    const request = new Request(new URL(req.url, `http://${host}`), {
      method: 'POST',
      headers: toHeaders(req.headers),
      body,
    })
    const response = await handleAppleWebRedirect(request)
    const text = await response.text()
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(text)

    return response.status
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    const file = resolveFile(pathname)
    const headers = {
      'Content-Type': contentTypes[extname(file).toLowerCase()] ?? 'application/octet-stream',
    }
    if (file === join(root, 'index.html')) {
      headers['Cache-Control'] = 'no-store'
    }
    const content = await readFile(file)
    headers['Content-Length'] = content.length
    res.writeHead(200, headers)
    res.end(req.method === 'HEAD' ? undefined : content)

    return 200
  }

  res.writeHead(405, { Allow: 'GET, HEAD, POST' })
  res.end()

  return 405
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${host}`).pathname
  let status = 500
  try {
    status = await handle(req, res, pathname)
  } catch {
    if (!res.headersSent) {
      res.writeHead(500)
    }
    res.end()
  }
  console.log(`${req.method} ${pathname} ${status}`)
})

server.listen(port, host, () => {
  console.log(`Serving example/dist at http://${host}:${port}`)
})
