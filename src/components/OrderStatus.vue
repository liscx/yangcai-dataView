<script setup>
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  statusRank: Array
})

const containerRef = ref(null)

const total = props.statusRank.reduce((s, x) => s + x.count, 0)

const statusColors = {
  '收货完成': 'var(--green)',
  '合同签署': 'var(--blue)',
  '已完成发货': 'var(--teal)',
  '待发货': 'var(--gold)',
  '待确认': 'var(--muted)',
  '审核不通过': 'var(--red)'
}

function getStatusColor(name) {
  return statusColors[name] || 'var(--muted)'
}

function getPercent(count) {
  return Math.round(count / total * 100)
}

onMounted(() => {
  if (!containerRef.value) return
  const items = containerRef.value.querySelectorAll('.status-item')
  gsap.from(items, {
    x: -20,
    opacity: 0,
    duration: 0.5,
    stagger: 0.08,
    ease: 'power2.out',
    delay: 0.6
  })
})
</script>

<template>
  <article ref="containerRef" class="panel">
    <div class="panel-head">
      <h2>订单状态分布</h2>
      <span class="note">按订单数</span>
    </div>
    <div class="status-list">
      <div
        v-for="item in statusRank"
        :key="item.name"
        class="status-item"
      >
        <div class="status-dot" :style="{ background: getStatusColor(item.name) }"></div>
        <div class="status-name">{{ item.name }}</div>
        <div class="status-bar">
          <div
            class="status-fill"
            :style="{
              width: getPercent(item.count) + '%',
              background: getStatusColor(item.name)
            }"
          ></div>
        </div>
        <div class="status-count">{{ item.count }}</div>
        <div class="status-pct">{{ getPercent(item.count) }}%</div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.panel {
  border: 1px solid rgba(255,255,255,.74);
  background: var(--panel);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
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

.status-list {
  display: grid;
  gap: 10px;
}

.status-item {
  display: grid;
  grid-template-columns: 8px 70px 1fr 40px 40px;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-name {
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-bar {
  height: 6px;
  border-radius: 3px;
  background: #edf1f7;
  overflow: hidden;
}

.status-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s ease;
}

.status-count {
  text-align: right;
  font-weight: 600;
  color: var(--ink);
}

.status-pct {
  text-align: right;
  color: var(--muted);
}
</style>
