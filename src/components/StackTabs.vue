<script setup>
// 堆叠卡片的层级切换 Tab（样式参考 TopStackCards.vue）
defineProps({
  tabs: { type: Array, default: () => [] },
  active: { type: String, default: '' }
})
defineEmits(['switch'])
</script>

<template>
  <div class="card-tab-switcher">
    <button
      v-for="t in tabs"
      :key="t.key"
      class="tab-btn"
      :class="{ active: active === t.key }"
      @click.stop="$emit('switch', t.key)"
    >{{ t.label }}</button>
  </div>
</template>

<style scoped>
.card-tab-switcher {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: #f1f5f9;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.tab-btn {
  border: 0;
  background: transparent;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.tab-btn:hover:not(.active) {
  color: #1e293b;
}
</style>
