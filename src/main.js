import { createApp } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import App from './App.vue'
import './style.css'

// 页面等比缩放：设计宽度 1920px，视口不足时自动缩小
const DESIGN_WIDTH = 1920

function updateZoom() {
  const ratio = window.innerWidth / DESIGN_WIDTH
  document.documentElement.style.setProperty('--page-zoom', Math.min(1, ratio))
}

updateZoom()
window.addEventListener('resize', updateZoom)

// 注册 GSAP 插件
gsap.registerPlugin(ScrollTrigger)

// 设置 GSAP 全局默认值
gsap.defaults({
  duration: 0.6,
  ease: 'power2.out'
})

createApp(App).mount('#app')
