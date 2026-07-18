import { motion } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/utils'

type StickerProps = {
  src: string
  alt?: string
  className?: string
  delay?: number
  rotate?: number
  floatRange?: number
}

/** Floating Pinterest-style sticker with gentle bob + tilt */
export function FloatingSticker({
  src,
  alt = '',
  className = '',
  delay = 0,
  rotate = 0,
  floatRange = 10,
}: StickerProps) {
  const reduce = prefersReducedMotion()

  return (
    <motion.img
      src={src}
      alt={alt}
      draggable={false}
      className={`pointer-events-none select-none drop-shadow-[0_10px_24px_rgba(196,144,138,0.35)] ${className}`}
      style={{ rotate }}
      initial={reduce ? false : { opacity: 0, scale: 0.85, y: 12 }}
      animate={
        reduce
          ? { opacity: 1, scale: 1, rotate }
          : {
              opacity: 1,
              scale: 1,
              y: [0, -floatRange, 0],
              rotate: [rotate - 3, rotate + 3, rotate - 3],
            }
      }
      transition={
        reduce
          ? { duration: 0.4 }
          : {
              opacity: { delay, duration: 0.5 },
              scale: { delay, duration: 0.5 },
              y: { delay: delay + 0.4, duration: 4.5 + delay, repeat: Infinity, ease: 'easeInOut' },
              rotate: { delay: delay + 0.4, duration: 5.5 + delay, repeat: Infinity, ease: 'easeInOut' },
            }
      }
    />
  )
}
