import { onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * GSAP 动画 composable
 * 提供统一的动画管理、清理和响应式支持
 */
export function useGSAPAnimation(containerRef) {
  let ctx = null

  onMounted(() => {
    if (!containerRef.value) return
    ctx = gsap.context(() => {}, containerRef.value)
  })

  onUnmounted(() => {
    ctx?.revert()
  })

  /**
   * 在上下文中执行动画
   */
  function animate(callback) {
    if (ctx) {
      callback()
    }
  }

  /**
   * 数字滚动动画
   */
  function animateNumber(element, targetValue, options = {}) {
    const {
      duration = 1.5,
      decimals = 0,
      prefix = '',
      suffix = '',
      ease = 'power2.out'
    } = options

    const obj = { value: 0 }
    return gsap.to(obj, {
      value: targetValue,
      duration,
      ease,
      onUpdate: () => {
        if (element) {
          const formatted = decimals > 0
            ? obj.value.toFixed(decimals)
            : Math.round(obj.value).toLocaleString('zh-CN')
          element.textContent = prefix + formatted + suffix
        }
      }
    })
  }

  /**
   * 卡片入场动画
   */
  function animateCardsIn(elements, options = {}) {
    const { stagger = 0.08, y = 30, duration = 0.6 } = options
    return gsap.from(elements, {
      y,
      opacity: 0,
      duration,
      stagger,
      ease: 'power2.out'
    })
  }

  /**
   * 滚动触发动画
   */
  function createScrollTrigger(element, animation, options = {}) {
    const {
      start = 'top 85%',
      end = 'bottom 15%',
      toggleActions = 'play none none reverse'
    } = options

    return ScrollTrigger.create({
      trigger: element,
      start,
      end,
      toggleActions,
      animation
    })
  }

  return {
    animate,
    animateNumber,
    animateCardsIn,
    createScrollTrigger,
    gsap
  }
}
