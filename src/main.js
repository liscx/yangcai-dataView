import { createApp } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createVuetify } from 'vuetify'
import { zhHans } from 'vuetify/locale'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import App from './App.vue'
import './style.css'

const vuetify = createVuetify({
  locale: {
    locale: 'zhHans',
    messages: { zhHans },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
        }
      }
    }
  }
})

// 禁止浏览器缩放（Ctrl+滚轮、Ctrl+/-、Ctrl+0）
window.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault() }, { passive: false })
window.addEventListener('keydown', e => {
  if (e.ctrlKey && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault()
})

// 注册 GSAP 插件
gsap.registerPlugin(ScrollTrigger)

// 设置 GSAP 全局默认值
gsap.defaults({
  duration: 0.6,
  ease: 'power2.out'
})

createApp(App).use(vuetify).mount('#app')
