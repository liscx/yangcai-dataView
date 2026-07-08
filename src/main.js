import { createApp } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import App from './App.vue'
import './style.css'

// 注册 GSAP 插件
gsap.registerPlugin(ScrollTrigger)

// 设置 GSAP 全局默认值
gsap.defaults({
  duration: 0.6,
  ease: 'power2.out'
})

createApp(App).mount('#app')
