import { motion } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/utils'

const COLORS = ['#e8a0b0', '#c9b8d9', '#b8c5b0', '#e8c4be', '#d4a5a0'] as const

/** Decorative spinning/floating scrunchie made of fabric-like rings */
export function ScrunchieAnimation({ className = '' }: { className?: string }) {
  const reduce = prefersReducedMotion()

  return (
    <div className={`relative mx-auto h-44 w-44 ${className}`} aria-hidden>
      {/* Soft glow behind */}
      <div className="absolute inset-4 rounded-full bg-rose-light/40 blur-2xl" />

      <motion.div
        className="absolute inset-0"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={reduce ? undefined : { duration: 18, repeat: Infinity, ease: 'linear' }}
      >
        {COLORS.map((color, i) => {
          const size = 100 - i * 10
          const offset = (100 - size) / 2
          return (
            <motion.div
              key={color}
              className="absolute rounded-full"
              style={{
                width: `${size}%`,
                height: `${size}%`,
                left: `${offset}%`,
                top: `${offset}%`,
                background: `radial-gradient(circle at 35% 35%, ${color}ee, ${color}99 55%, ${color}66)`,
                boxShadow: `inset 0 0 0 10px ${color}55, inset 8px 8px 16px rgba(255,255,255,0.35), inset -6px -8px 14px rgba(0,0,0,0.08)`,
              }}
              animate={
                reduce
                  ? undefined
                  : {
                      scale: [1, 1.04, 1],
                      borderRadius: [
                        '42% 58% 55% 45%',
                        '55% 45% 42% 58%',
                        '42% 58% 55% 45%',
                      ],
                    }
              }
              transition={{
                duration: 3.2 + i * 0.35,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.12,
              }}
            />
          )
        })}
        {/* Center hole */}
        <div
          className="absolute left-1/2 top-1/2 h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, #fff7f5 40%, #f3ebe8)',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.08)',
          }}
        />
      </motion.div>

      {/* Tiny orbiting sparkles */}
      {!reduce &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-white shadow-sm"
            style={{ originX: '0px', originY: '0px' }}
            animate={{
              x: [0, Math.cos((i * 2.1) * Math.PI) * 78, 0],
              y: [0, Math.sin((i * 2.1) * Math.PI) * 78, 0],
              opacity: [0.2, 1, 0.2],
              scale: [0.6, 1.2, 0.6],
            }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
          />
        ))}
    </div>
  )
}
