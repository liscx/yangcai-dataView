<script setup>
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  generatedAt: String,
  dataEndDate: String,
  source: String
})

const heroRef = ref(null)
const titleRef = ref(null)
const subtitleRef = ref(null)
const stampRef = ref(null)

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
    <div>
      <h1 ref="titleRef">阳光优采经营驾驶舱</h1>
      <div ref="subtitleRef" class="subtitle">专区收益、订单趋势、采购企业与供应商结构总览</div>
    </div>
    <div ref="stampRef" class="stamp">
      数据截至：{{ dataEndDate }}<br>
      生成时间：{{ generatedAt }}<br>
      来源：{{ source }}
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  align-items: end;
  padding: 28px 32px;
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

h1 {
  margin: 0;
  font-size: 34px;
  letter-spacing: 0;
  font-weight: 800;
  color: var(--ink);
}

.subtitle {
  margin-top: 10px;
  color: var(--muted);
  font-size: 14px;
}

.stamp {
  min-width: 260px;
  text-align: right;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.8;
}
</style>
