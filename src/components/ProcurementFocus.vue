<script setup>
import { computed } from 'vue'

const props = defineProps({
  buyerRank: Array,
  kpis: Object,
  monthTrend: Array
})

// 计算本月新专区：之前月份都为0，只有本月有订单
const newZones = computed(() => {
  if (!props.monthTrend || props.monthTrend.length < 2) return []

  const currentMonth = props.monthTrend[props.monthTrend.length - 1]
  const previousMonths = props.monthTrend.slice(0, -1)

  // 获取所有专区名称
  const zoneNames = Object.keys(currentMonth).filter(k => k !== 'label' && k !== 'count')

  return zoneNames.filter(zone => {
    const currentVal = currentMonth[zone] || 0
    const hadBefore = previousMonths.some(m => (m[zone] || 0) > 0)
    return currentVal > 0 && !hadBefore
  }).map(zone => ({
    name: zone,
    amount: currentMonth[zone]
  }))
})
</script>

<template>
  <article class="panel">
    <div class="panel-head">
      <h2>本月新专区</h2>
      <span class="note">{{ newZones.length }} 个</span>
    </div>
    <div v-if="newZones.length > 0" class="tags">
      <span v-for="zone in newZones" :key="zone.name" class="tag" :title="zone.name">{{ zone.name }}</span>
    </div>
    <div v-else class="empty">本月暂无新专区</div>
  </article>
</template>

<style scoped>
.panel {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 18px;
  display: flex;
  flex-direction: column;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
  flex-shrink: 0;
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

.tags {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
  padding-bottom: 10px;
}

.tags::-webkit-scrollbar {
  width: 4px;
}

.tags::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.tags::-webkit-scrollbar-track {
  background: transparent;
}

.tag {
  display: inline-block;
  padding: 5px 12px;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border: 1px solid #86efac;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #16a34a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.empty {
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
