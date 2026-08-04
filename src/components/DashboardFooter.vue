<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'

const footerRef = ref(null)
let animationContext = null

onMounted(() => {
  if (!footerRef.value) return
  animationContext = gsap.context(() => {
    gsap.from(footerRef.value, {
      autoAlpha: 0,
      y: 20,
      duration: 0.5,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: footerRef.value,
        start: 'top 95%',
        toggleActions: 'play none none reverse'
      }
    })
  }, footerRef.value)
})

onUnmounted(() => animationContext?.revert())
</script>

<template>
  <div ref="footerRef" class="footer">
    统计口径：按订单号去重，订单金额取订单首行"订单金额（元）"。
  </div>
</template>

<style scoped>
.footer {
  text-align: center;
  padding: 20px;
  color: var(--muted);
  font-size: 12px;
  margin-top: 16px;
}
</style>
