<script setup>
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'
import { domToJpeg } from 'modern-screenshot'

const props = defineProps({
  generatedAt: String,
  dataEndDate: String,
  source: String
})

const heroRef = ref(null)
const titleRef = ref(null)
const subtitleRef = ref(null)
const stampRef = ref(null)
const capturing = ref(false)

async function captureScreenshot() {
  if (capturing.value) return
  capturing.value = true

  try {
    const dataUrl = await domToJpeg(document.body, {
      backgroundColor: '#f8fafc',
      scale: 2,
      style: { transform: 'none' }
    })
    const link = document.createElement('a')
    link.download = `阳光优采经营驾驶舱_${props.dataEndDate}.jpg`
    link.href = dataUrl
    link.click()
  } catch (e) {
    console.error('截图失败:', e)
  } finally {
    capturing.value = false
  }
}

onMounted(() => {
  if (!heroRef.value) return

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

  tl.from(heroRef.value, {
    y: -40,
    opacity: 0,
    duration: 0.8
  })
  .from(titleRef.value, {
    x: -30,
    opacity: 0,
    duration: 0.6
  }, '-=0.4')
  .from(subtitleRef.value, {
    x: -20,
    opacity: 0,
    duration: 0.5
  }, '-=0.3')
  .from(stampRef.value, {
    x: 30,
    opacity: 0,
    duration: 0.5
  }, '-=0.4')
})
</script>

<template>
  <section ref="heroRef" class="hero">
    <div class="title-wrapper">
      <h1 ref="titleRef">阳光优采经营驾驶舱</h1>
      <div ref="subtitleRef" class="subtitle">专区收益、订单趋势、采购企业与供应商结构总览</div>
    </div>
    <div class="hero-footer">
      <div ref="stampRef" class="stamp">
        数据截至：{{ dataEndDate }}<br>
        生成时间：{{ generatedAt }}
      </div>
      <button class="screenshot-btn" title="截图下载" @click="captureScreenshot">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.hero::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--blue), var(--teal));
}

.title-wrapper {
  display: block;
}

h1 {
  margin: 0;
  font-size: 50px;
  letter-spacing: 0;
  font-weight: 800;
  color: var(--ink);
}

.subtitle {
  margin-top: 6px;
  color: var(--muted);
  font-size: 15px;
}

.hero-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.stamp {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
}

.screenshot-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255,255,255,.7);
  color: var(--muted);
  cursor: pointer;
  transition: all .2s ease;
  flex-shrink: 0;
}

.screenshot-btn:hover {
  color: var(--ink);
  border-color: var(--blue);
  background: rgba(59,130,246,.06);
}
</style>
