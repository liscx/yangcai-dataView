import {Readable} from 'node:stream'
import {defineConfig, loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

function createAiProxy({apiBase, apiKey, model}) {
    async function handler(req, res) {
        if (req.method !== 'POST') {
            res.statusCode = 405
            res.end('Method Not Allowed')
            return
        }

        if (!apiKey) {
            res.statusCode = 503
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({error: 'AI_API_KEY is not configured on the server'}))
            return
        }

        try {
            const chunks = []
            for await (const chunk of req) chunks.push(chunk)
            const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            const upstream = await fetch(`${apiBase.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({...payload, model})
            })

            res.statusCode = upstream.status
            res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8')
            res.setHeader('Cache-Control', 'no-store')

            if (!upstream.body) {
                res.end()
                return
            }
            Readable.fromWeb(upstream.body).pipe(res)
        } catch (error) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({error: 'AI proxy request failed', detail: error.message}))
        }
    }

    return {
        name: 'local-ai-proxy',
        configureServer(server) {
            server.middlewares.use('/api/ai/chat/completions', handler)
        },
        configurePreviewServer(server) {
            server.middlewares.use('/api/ai/chat/completions', handler)
        }
    }
}

// ============ 访问者 IP 记录（Vite dev middleware，仅本地 npm run dev 生效）============
// GET /api/client-ip  → 返回访问者真实 IP（局域网访问时为 192.168.x.x，不是 127.0.0.1）
// POST /api/log-visit → 接收前端 fetch，追加一行到 src/assets/visitor_log_YYYY-MM-DD.csv
//                      （同 IP 5 分钟内只记一次，按日分文件）
function createVisitorLogger() {
    const {existsSync, mkdirSync, appendFileSync, statSync} = require('node:fs')
    const {join} = require('node:path')

    const LOG_DIR = join(process.cwd(), 'src', 'assets')
    const DEDUPE_WINDOW_MS = 5 * 60 * 1000
    const seenMap = new Map() // ip -> lastWriteTimestamp

    function formatDate(d = new Date()) {
        const pad = n => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }

    function csvEscape(v) {
        if (v == null) return ''
        const s = String(v)
        // 包含逗号/引号/换行的字段用引号包裹，引号双写
        if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
        return s
    }

    function appendRow(row) {
        const dir = LOG_DIR
        if (!existsSync(dir)) mkdirSync(dir, {recursive: true})
        const file = join(dir, `visitor_log_${formatDate()}.csv`)
        const line = row.map(csvEscape).join(',') + '\n'

        // 首次写入时加表头（同一天的文件不重复加）
        const isNew = !existsSync(file) || statSync(file).size === 0
        if (isNew) {
            appendFileSync(file, '\uFEFF') // UTF-8 BOM 让 Excel 识别中文
            appendFileSync(file, '时间,IP,路径,UA,Referer,进入方式,screen,语言,时区\n')
        }
        appendFileSync(file, line, 'utf8')
    }

    function getClientIp(req) {
        // 优先读反向代理头，本地 dev 一般没走到这层
        const xff = req.headers['x-forwarded-for']
        if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim()
        const real = req.headers['x-real-ip']
        if (typeof real === 'string' && real.length > 0) return real
        // Vite dev server 直连：socket.remoteAddress 就是发起请求的 IP
        return req.socket?.remoteAddress || ''
    }

    function bindRoute(server, middlewareName) {
        // /api/client-ip：返回发起请求的真实 IP
        server.middlewares.use('/api/client-ip', (req, res) => {
            const ip = getClientIp(req)
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ip}))
        })

        // /api/log-visit：前端登录成功后 fetch，附带客户端上下文；服务端按 IP 去重
        server.middlewares.use('/api/log-visit', async (req, res) => {
            if (req.method !== 'POST') {
                res.statusCode = 405
                return res.end('Method Not Allowed')
            }
            try {
                const chunks = []
                for await (const c of req) chunks.push(c)
                const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')

                const ip = getClientIp(req) || body.ip || ''
                const now = Date.now()
                const last = seenMap.get(ip) || 0
                const dup = now - last < DEDUPE_WINDOW_MS

                if (!dup) {
                    seenMap.set(ip, now)
                    appendRow([
                        body.time || new Date().toISOString(),
                        ip,
                        body.path || '',
                        body.ua || (req.headers['user-agent'] || ''),
                        body.referer || (req.headers['referer'] || ''),
                        body.entry || '',
                        body.screen || '',
                        body.lang || '',
                        body.tz || ''
                    ])
                }

                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ok: true, dedup: dup, ip}))
            } catch (err) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ok: false, error: err.message}))
            }
        })
    }

    return {
        name: 'visitor-logger',
        configureServer(server) {
            bindRoute(server, 'dev')
            // 让 Vite 不监听日志文件，避免每次写一行就触发 HMR / 全页重载
            const unwatch = () => {
                try {
                    server.watcher.unwatch('src/assets/visitor_log_*.csv')
                } catch (_) {}
            }
            unwatch()
            // 兜底：HMR 文件监听后再 unwatch 一次（处理运行时新增的文件）
            setTimeout(unwatch, 1000)
            server.httpServer?.on('listening', unwatch)
        },
        configurePreviewServer(server) {
            bindRoute(server, 'preview')
        }
    }
}

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), '')
    return {
        plugins: [
            vue(),
            vuetify({ autoImport: true }),
            createAiProxy({
                apiBase: env.AI_API_URL || env.VITE_AI_API_URL || 'https://api.openai.com/v1',
                apiKey: env.AI_API_KEY || env.VITE_AI_API_KEY || '',
                model: env.AI_MODEL || env.VITE_AI_MODEL || 'gpt-4o-mini'
            }),
            createVisitorLogger()
        ],
        server: {
            host: '0.0.0.0',
            port: '8888',
            open: true
        }
    }
})
