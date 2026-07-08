<script setup>
const props = defineProps({
  buyerRank: Array,
  kpis: Object
})
</script>

<template>
  <article class="panel">
    <div class="panel-head">
      <h2>占位1</h2>
      <span class="note">采购企业</span>
    </div>
    <div class="placeholder"></div>
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

.placeholder {
  min-height: 120px;
}
</style>
