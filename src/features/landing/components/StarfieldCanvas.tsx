import { useEffect, useRef, type FC } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  baseAlpha: number
  alpha: number
  twinkleSpeed: number
}

export const StarfieldCanvas: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = 0
    let height = 0
    let particles: Particle[] = []

    // Detect reduced motion preference safely
    const prefersReducedMotion =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false

    // Check mobile screen
    const isMobile = window.innerWidth < 768

    // Particle count: 25 on mobile, 65 on desktop (reduced count if motion reduced)
    const particleCount = prefersReducedMotion ? 35 : (isMobile ? 25 : 65)
    const maxConnectionDistance = isMobile ? 0 : 95 // Skip connection lines on mobile for max fps

    // Pointer tracking with smooth lerp
    let mouseX = -1000
    let mouseY = -1000
    let targetParallaxX = 0
    let targetParallaxY = 0
    let currentParallaxX = 0
    let currentParallaxY = 0

    const initSize = () => {
      const parent = canvas.parentElement
      width = parent ? parent.clientWidth : window.innerWidth
      height = parent ? parent.clientHeight : window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
    }

    const initParticles = () => {
      particles = []
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * (isMobile ? 0.2 : 0.35),
          vy: (Math.random() - 0.5) * (isMobile ? 0.2 : 0.35),
          radius: Math.random() * 1.4 + 0.6,
          baseAlpha: Math.random() * 0.45 + 0.25,
          alpha: Math.random() * 0.45 + 0.25,
          twinkleSpeed: Math.random() * 0.012 + 0.006,
        })
      }
    }

    initSize()
    initParticles()

    const handleResize = () => {
      initSize()
      initParticles()
    }

    const handlePointerMove = (e: MouseEvent) => {
      if (prefersReducedMotion || isMobile) return
      const rect = canvas.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top
      targetParallaxX = (e.clientX / window.innerWidth - 0.5) * 18
      targetParallaxY = (e.clientY / window.innerHeight - 0.5) * 18
    }

    const handlePointerLeave = () => {
      mouseX = -1000
      mouseY = -1000
      targetParallaxX = 0
      targetParallaxY = 0
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handlePointerMove)
    document.addEventListener('mouseleave', handlePointerLeave)

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Smooth parallax lerp
      currentParallaxX += (targetParallaxX - currentParallaxX) * 0.05
      currentParallaxY += (targetParallaxY - currentParallaxY) * 0.05

      // Draw connection lines between nearby particles
      if (maxConnectionDistance > 0 && !prefersReducedMotion) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i]
            const p2 = particles[j]
            const dx = (p1.x + currentParallaxX) - (p2.x + currentParallaxX)
            const dy = (p1.y + currentParallaxY) - (p2.y + currentParallaxY)
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < maxConnectionDistance) {
              const lineAlpha = (1 - dist / maxConnectionDistance) * 0.12
              ctx.strokeStyle = `rgba(147, 163, 253, ${lineAlpha})`
              ctx.lineWidth = 0.75
              ctx.beginPath()
              ctx.moveTo(p1.x + currentParallaxX, p1.y + currentParallaxY)
              ctx.lineTo(p2.x + currentParallaxX, p2.y + currentParallaxY)
              ctx.stroke()
            }
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.x += p.vx
          p.y += p.vy

          // Wrap edges
          if (p.x < 0) p.x = width
          if (p.x > width) p.x = 0
          if (p.y < 0) p.y = height
          if (p.y > height) p.y = 0

          // Gentle twinkle oscillation
          p.alpha = p.baseAlpha + Math.sin(Date.now() * p.twinkleSpeed) * 0.12
        }

        const renderX = p.x + currentParallaxX
        const renderY = p.y + currentParallaxY

        // Subtle proximity brighten near cursor
        let extraAlpha = 0
        if (!prefersReducedMotion && mouseX > 0 && mouseY > 0) {
          const mdx = renderX - mouseX
          const mdy = renderY - mouseY
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy)
          if (mDist < 110) {
            extraAlpha = (1 - mDist / 110) * 0.3
          }
        }

        const finalAlpha = Math.min(0.95, Math.max(0.15, p.alpha + extraAlpha))
        ctx.fillStyle = `rgba(165, 180, 252, ${finalAlpha})`
        ctx.beginPath()
        ctx.arc(renderX, renderY, p.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handlePointerMove)
      document.removeEventListener('mouseleave', handlePointerLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full pointer-events-none z-0"
    />
  )
}
