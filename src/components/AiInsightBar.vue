<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { gsap } from 'gsap'

// 导入 prompt 模板
import promptTemplate from '../agent/prompt.md?raw'

const props = defineProps({
  active: Boolean,
  dashboardData: Object
})

const emit = defineEmits(['close'])

const barRef = ref(null)
const wrapperRef = ref(null)
const analyzing = ref(false)
const resultText = ref('')
const errorMsg = ref('')
const isFromCache = ref(false)
let abortController = null
let marqueeTl = null
let expandTl = null

// AI API 配置
const API_URL = import.meta.env.VITE_AI_API_URL || 'https://api.openai.com/v1'
const API_KEY = import.meta.env.VITE_AI_API_KEY || ''
const MODEL = import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini'

// 缓存 key
const CACHE_KEY = 'ai_insight_cache'

function saveCache(text) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      text,
      timestamp: Date.now(),
      dataEndDate: props.dashboardData?.dataEndDate
    }))
  } catch {
    // ignore storage errors
  }
}

function loadCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const { text, dataEndDate } = JSON.parse(cached)
    // 校验数据日期是否匹配（数据更新后自动失效）
    if (dataEndDate !== props.dashboardData?.dataEndDate) return null
    return text
  } catch {
    return null
  }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // ignore
  }
}

function buildMessages(data) {
  const dataJson = JSON.stringify(data, null, 2)
  const userContent = promptTemplate.replace('{{订单统计JSON数据}}', dataJson)

  return [
    { role: 'user', content: userContent }
  ]
}

async function startAnalysis(forceRefresh = false) {
  if (analyzing.value || !props.dashboardData) return

  // 非强制刷新时，先尝试加载缓存
  if (!forceRefresh) {
    const cached = loadCache()
    if (cached) {
      resultText.value = cached
      isFromCache.value = true
      errorMsg.value = ''
      return
    }
  }

  analyzing.value = true
  resultText.value = ''
  errorMsg.value = ''
  isFromCache.value = false

  abortController = new AbortController()

  try {
    const messages = buildMessages(props.dashboardData)

    const response = await fetch(`${API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1500
      }),
      signal: abortController.signal
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') break

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            fullText += content
            resultText.value = fullText
          }
        } catch {
          // skip malformed JSON
        }
      }
    }

    // 生成完成，保存缓存
    if (fullText) {
      saveCache(fullText)
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('AI 分析失败:', err)
      errorMsg.value = '分析失败，请重试'
    }
  } finally {
    analyzing.value = false
    abortController = null
  }
}

function refreshInsight() {
  if (abortController) {
    abortController.abort()
  }
  analyzing.value = false
  isFromCache.value = false
  resultText.value = ''
  errorMsg.value = ''
  clearCache()
  setTimeout(() => startAnalysis(true), 100)
}

function animateExpand(show) {
  if (!wrapperRef.value) return

  if (expandTl) {
    expandTl.kill()
  }

  const el = wrapperRef.value

  if (show) {
    el.style.display = 'block'
    expandTl = gsap.fromTo(el,
      { height: 0, opacity: 0, overflow: 'hidden' },
      {
        height: 'auto',
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
        onComplete: () => {
          el.style.overflow = 'visible'
        }
      }
    )
  } else {
    expandTl = gsap.to(el, {
      height: 0,
      opacity: 0,
      overflow: 'hidden',
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        el.style.display = 'none'
      }
    })
  }
}

watch(() => props.active, (val) => {
  animateExpand(val)
  if (val && props.dashboardData) {
    startAnalysis(false)
  } else if (!val) {
    if (abortController) {
      abortController.abort()
    }
    analyzing.value = false
    errorMsg.value = ''
  }
})

onMounted(() => {
  if (barRef.value) {
    const borderEl = barRef.value.querySelector('.insight-border')
    if (borderEl) {
      marqueeTl = gsap.to(borderEl, {
        backgroundPosition: '400% center',
        duration: 3,
        ease: 'none',
        repeat: -1
      })
    }
  }
})

onUnmounted(() => {
  if (abortController) {
    abortController.abort()
  }
  if (marqueeTl) {
    marqueeTl.kill()
    marqueeTl = null
  }
})
</script>

<template>
  <div ref="wrapperRef" class="ai-bar-wrapper" :style="{ display: active ? 'block' : 'none' }">
    <div ref="barRef" class="ai-insight-bar">
      <div class="insight-border"></div>

      <div class="insight-content">
        <div class="insight-header">
          <div class="insight-badge">
            <span class="badge-dot"></span>
            <span class="badge-text">AI 智能解读</span>
            <span v-if="analyzing" class="analyzing-tag">分析中...</span>
            <span v-else-if="isFromCache && resultText" class="cache-tag">已缓存</span>
          </div>
          <div class="insight-actions">
            <button class="action-btn refresh" title="重新生成" @click="refreshInsight" :disabled="analyzing">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"/>
                <path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
              </svg>
            </button>
            <button class="action-btn close" title="关闭" @click="$emit('close')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="insight-body">
          <span v-if="resultText" class="result-text">{{ resultText }}</span>
          <span v-if="analyzing && !resultText" class="loading-dots">
            <span>●</span><span>●</span><span>●</span>
          </span>
          <span v-if="errorMsg" class="error-text">{{ errorMsg }}</span>
          <span v-if="!resultText && !analyzing && !errorMsg" class="placeholder">点击按钮开始 AI 分析...</span>
        </div>
      </div>

      <div class="insight-glow"></div>
    </div>
  </div>
</template>

<style scoped>
.ai-insight-bar {
  position: relative;
  grid-column: 1 / -1;
  min-height: 100px;
  max-height: 200px;
  border-radius: var(--radius);
  background: var(--panel);
  overflow: hidden;
  display: flex;
  align-items: center;
  will-change: transform, opacity;
}

.insight-border {
  position: absolute;
  inset: 0;
  border-radius: var(--radius);
  padding: 1.5px;
  background: linear-gradient(
    90deg,
    #667eea,
    #764ba2,
    #f093fb,
    #667eea,
    #764ba2,
    #f093fb,
    #667eea
  );
  background-size: 400% 100%;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.insight-content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 20px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03), rgba(118, 75, 162, 0.03));
  max-height: 200px;
  overflow-y: auto;
}

.insight-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.insight-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

.badge-text {
  font-size: 13px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.analyzing-tag {
  font-size: 11px;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
  animation: pulse-tag 1.5s ease-in-out infinite;
}

.cache-tag {
  font-size: 11px;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

@keyframes pulse-tag {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.insight-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  color: var(--ink);
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.06);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn.close:hover {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.06);
  color: #ef4444;
}

.insight-body {
  font-size: 14px;
  line-height: 1.6;
  color: var(--ink);
  min-height: 22px;
}

.result-text {
  display: inline;
}

.loading-dots span {
  display: inline-block;
  color: #667eea;
  font-size: 10px;
  margin: 0 2px;
  animation: dot-bounce 1.4s ease-in-out infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dot-bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}

.error-text {
  color: #ef4444;
  font-size: 13px;
}

.placeholder {
  color: var(--muted);
  font-size: 13px;
}

.insight-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 50%, rgba(102, 126, 234, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 70% 50%, rgba(118, 75, 162, 0.06) 0%, transparent 50%);
  pointer-events: none;
  animation: glow-rotate 10s linear infinite;
}

@keyframes glow-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
