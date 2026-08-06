# 阳光优采数据看板

Vue 3、Vite、ECharts 和 GSAP 构建的内部经营看板。

## 本地开发

```bash
npm install
npm run dev
```

复制 `.env.example` 为 `.env` 后配置 AI 服务。`AI_API_KEY` 只由 Vite 的服务端代理读取，不会打进浏览器产物：

```env
AI_API_URL=https://api.openai.com/v1
AI_API_KEY=sk-your-api-key-here
AI_MODEL=gpt-4o-mini
```

前端统一请求 `/api/ai/chat/completions`。`npm run dev` 和 `npm run preview` 已提供该代理；如果生产环境直接托管 `dist` 静态文件，需要在网关中配置同路径的服务端代理。

## 更新看板数据

脚本会按以下顺序查找 Excel，然后生成看板数据：

1. 上级目录的 `Data/source_data.xlsx`
2. `src/assets/阳光优采交易订单.xlsx`

```bash
python process_data.py
```

脚本输出 `src/data/dashboard.json`。

## 构建

```bash
npm run build
npm run preview
```
