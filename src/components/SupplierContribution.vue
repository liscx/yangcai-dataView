<script setup>
const props = defineProps({
  supplierRank: Array,
  kpis: Object,
  zoneRank: Array
})
</script>

<template>
  <article class="panel">
    <div class="panel-head">
      <h2>已上量专区</h2>
      <span class="note">{{ zoneRank.length }} 个</span>
    </div>
    <div class="tags">
      <span v-for="zone in zoneRank" :key="zone.name" class="tag" :title="zone.name">{{ zone.name }}</span>
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
