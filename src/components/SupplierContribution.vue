<script setup>
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  supplierRank: Array,
  kpis: Object
})

const containerRef = ref(null)

onMounted(() => {
  if (!containerRef.value) return
  gsap.from(containerRef.value.querySelectorAll('.metric-tile'), {
    y: 10,
    opacity: 0,
    duration: 0.4,
    stagger: 0.1,
    ease: 'power2.out',
    delay: 0.8,
    clearProps: 'all'
  })
})
</script>

<template>
  <article ref="containerRef" class="panel">
    <div class="panel-head">
      <h2>供应商贡献</h2>
      <span class="note">供应商侧</span>
    </div>
    <div class="tile-grid">
      <div class="metric-tile">
        <span>供应商数</span>
        <strong>{{ props.kpis.supplierCount }}</strong>
        <em>本地与电商合计</em>
      </div>
      <div class="metric-tile">
        <span>供应商 top10 金额占比</span>
        <strong>{{ Math.round(props.kpis.supplierTop10Share * 100) }}%</strong>
        <em>头部供应商贡献度</em>
      </div>
    </div>
  </article>
</template>

<style scoped>
.panel {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 18px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}

h2 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0;
  color: var(--ink);
  font-weight: 700;
}

.note {
  color: var(--muted);
  font-size: 12px;
}

.tile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.metric-tile {
  padding: 54px 8px;
  border: 1px solid rgba(13, 148, 136, 0.1);
  border-radius: 8px;
  background: linear-gradient(to top, rgba(209, 250, 229, 0.5), rgba(255, 255, 255, 0.95));
}

.metric-tile span {
  display: block;
  color: var(--muted);
  font-size: 13px;
}

.metric-tile strong {
  display: block;
  margin-top: 10px;
  font-size: 28px;
}

.metric-tile em {
  display: block;
  margin-top: 8px;
  color: var(--muted);
  font-size: 12px;
  font-style: normal;
}
</style>
