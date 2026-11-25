// 模块行为埋点：记录每个模块的「查看」与「点击」
// 事件在前端缓冲后批量 POST 到 /api/log-event，由 Vite 中间件追加写入单一 event_log.csv。
// 时间统一由服务端 +8 转成北京时间，前端只传毫秒时间戳，避免依赖客户端时区。

const FLUSH_MS = 2000        // 最多缓冲 2 秒
const FLUSH_SIZE = 10        // 或攒够 10 条就发
const MAX_TEXT = 120         // 单字段截断，防止日志膨胀

let context = null           // { sessionId, ip, path, entry }
let queue = []
let timer = null
let started = false
let bound = false
const lastSeen = new Map()   // moduleId -> 上次事件时间戳，用于算停留 ms

function newSessionId() {
  return 'S-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

function clean(v) {
  return String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, MAX_TEXT)
}

function describe(el) {
  if (!el || !el.tagName) return ''
  const tag = el.tagName.toLowerCase()
  const label = el.getAttribute('aria-label') || el.getAttribute('title') || ''
  return label ? `${tag}[${clean(label)}]` : tag
}

// 输入框 / 下拉只记录提示文案，不记录用户输入的原文（避免采集搜索词、供应商名等）
function textOf(el) {
  if (!el || !el.tagName) return ''
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return clean(el.getAttribute('placeholder') || el.getAttribute('aria-label') || tag)
  }
  return clean(el.getAttribute('title') || el.textContent || '')
}

function push(type, moduleId, moduleName, element, value) {
  if (!started) return
  const ts = Date.now()
  const prev = lastSeen.get(moduleId)
  const dwell = prev ? ts - prev : 0
  lastSeen.set(moduleId, ts)
  queue.push({ ts, type, moduleId, moduleName, element, value, dwell })
  if (queue.length >= FLUSH_SIZE) flush()
  else if (!timer) timer = setTimeout(flush, FLUSH_MS)
}

function flush() {
  if (timer) { clearTimeout(timer); timer = null }
  if (!queue.length || !context) return
  const events = queue
  queue = []
  try {
    fetch('/api/log-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, events }),
      keepalive: true
    }).catch(() => {})
  } catch (_) {
    // 静默失败，不影响页面交互
  }
}

function onClick(e) {
  const host = e.target?.closest?.('[data-track]')
  if (!host) return
  push('click', host.dataset.trackId || '', host.dataset.track || '', describe(e.target), textOf(e.target))
}

function onVisibilityChange() {
  if (document.visibilityState === 'hidden') flush()
}

function install() {
  if (bound) return
  bound = true
  document.addEventListener('click', onClick, { capture: true, passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', flush)
}

// 登录成功后调用：等 DOM 渲染完，再为每个顶层模块各记一次「查看」
export function startTracking(options = {}) {
  install()
  context = {
    sessionId: options.sessionId || newSessionId(),
    ip: options.ip || '',
    path: options.path || window.location.pathname,
    entry: options.entry || ''
  }
  started = true
  queue = []
  lastSeen.clear()
  document.querySelectorAll('[data-track]').forEach(el => {
    push('view', el.dataset.trackId || '', el.dataset.track || '', '', '')
  })
  flush()
}

// 显式记录一条事件（供弹窗等无 data-track 容器的场景使用）
export function track(type, moduleId, moduleName, detail = '') {
  push(type, moduleId, moduleName, '', clean(detail))
}

// 从卡片 DOM 向上找到所属模块，记录它成为「可见主卡」
export function trackViewFrom(el, detail = '') {
  const host = el?.closest?.('[data-track]')
  if (!host) return
  push('view', host.dataset.trackId || '', host.dataset.track || '', '', clean(detail))
}

// 供组件内一行调用，避免每个组件都 import
if (typeof window !== 'undefined') {
  window.__ygycTrack = track
  window.__ygycView = trackViewFrom
}
