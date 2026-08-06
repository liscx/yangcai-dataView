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
            })
        ],
        server: {
            host: '0.0.0.0',
            port: '8888',
            open: true
        }
    }
})
