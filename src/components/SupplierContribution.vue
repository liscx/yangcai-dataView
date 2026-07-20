<script setup>
const props = defineProps({
  supplierRank: Array,
  kpis: Object,
  zoneRank: Array
})

// 彩虹配色方案
const rainbowColors = [
  { bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)', border: '#fca5a5', text: '#dc2626' },
  { bg: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '#fdba74', text: '#ea580c' },
  { bg: 'linear-gradient(135deg, #fefce8, #fef9c3)', border: '#fde047', text: '#ca8a04' },
  { bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '#86efac', text: '#16a34a' },
  { bg: 'linear-gradient(135deg, #ecfeff, #cffafe)', border: '#67e8f9', text: '#0891b2' },
  { bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '#93c5fd', text: '#2563eb' },
  { bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '#c4b5fd', text: '#7c3aed' },
  { bg: 'linear-gradient(135deg, #fdf2f8, #fce7f3)', border: '#f9a8d4', text: '#db2777' },
]

function getTagStyle(index) {
  const color = rainbowColors[index % rainbowColors.length]
  return {
    background: color.bg,
    borderColor: color.border,
    color: color.text
  }
}
</script>

<template>
  <article class="panel">
    <div class="panel-head">
      <h2>已上量专区</h2>
      <span class="note">{{ zoneRank.length }} 个</span>
    </div>
    <div class="tags">
      <span v-for="(zone, index) in zoneRank" :key="zone.name" class="tag" :style="getTagStyle(index)" :title="zone.name">{{ zone.name }}</span>
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
  max-height: 190px;
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
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 1px solid #93c5fd;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
