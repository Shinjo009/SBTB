import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import logo from '@/assets/logo.png'
// Transparent sticker cutouts (white/cream backgrounds removed)
import scrunchieHero from '@/assets/stickers/scrunchie-graphic.png'
import scrunchieSticker from '@/assets/stickers/scrunchie-sticker.png'
import justAGirl from '@/assets/stickers/just-a-girl-text.png'
import bowGirl from '@/assets/stickers/bow-girl.png'
import moneyBow from '@/assets/stickers/money-bow.png'
import { Button } from '@/components/ui/Button'
import { FloatingSticker } from '@/components/storefront/FloatingSticker'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { prefersReducedMotion } from '@/lib/utils'

export default function WelcomePage() {
  useDocumentTitle('Welcome')
  const reduce = prefersReducedMotion()

  return (
    <div
      className="relative flex h-dvh max-h-dvh flex-col overflow-hidden px-5 py-4 sm:px-6 sm:py-5"
      style={{
        background:
          'radial-gradient(ellipse at 15% 5%, #ffe4ec 0%, transparent 42%), radial-gradient(ellipse at 90% 15%, #f3e8ff 0%, transparent 40%), radial-gradient(ellipse at 50% 100%, #fff0e8 0%, transparent 45%), #fffaf7',
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <FloatingSticker
          src={scrunchieSticker}
          className="absolute -left-2 top-10 w-16 sm:left-3 sm:w-20"
          rotate={-12}
          delay={0.1}
          floatRange={8}
        />
        <FloatingSticker
          src={justAGirl}
          className="absolute right-0 top-12 w-16 sm:right-4 sm:w-20"
          rotate={8}
          delay={0.2}
          floatRange={9}
        />
        <FloatingSticker
          src={bowGirl}
          className="absolute -right-3 bottom-20 w-20 opacity-95 sm:right-1 sm:w-24"
          rotate={6}
          delay={0.35}
          floatRange={8}
        />
        <FloatingSticker
          src={moneyBow}
          className="absolute -left-2 bottom-16 w-16 opacity-90 sm:left-2 sm:w-20"
          rotate={-8}
          delay={0.45}
          floatRange={8}
        />
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col items-center justify-center"
      >
        <motion.img
          src={scrunchieHero}
          alt="Scrunchies"
          className="mb-3 h-auto w-[min(58vw,200px)] shrink-0 drop-shadow-[0_12px_28px_rgba(232,100,140,0.22)]"
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={
            reduce
              ? { opacity: 1, scale: 1 }
              : { opacity: 1, scale: 1, y: [0, -5, 0], rotate: [-1.5, 1.5, -1.5] }
          }
          transition={
            reduce
              ? { duration: 0.35 }
              : {
                  opacity: { duration: 0.4 },
                  scale: { type: 'spring', stiffness: 170, damping: 16 },
                  y: { delay: 0.4, duration: 4, repeat: Infinity, ease: 'easeInOut' },
                  rotate: { delay: 0.4, duration: 5, repeat: Infinity, ease: 'easeInOut' },
                }
          }
        />

        <div className="mb-2 shrink-0 rounded-full bg-white/90 p-1 shadow-md ring-1 ring-rose/20">
          <img
            src={logo}
            alt="Scrunchies By The Bunch"
            className="h-11 w-11 rounded-full object-cover"
          />
        </div>

        <p className="shrink-0 font-display text-[10px] font-semibold tracking-[0.18em] text-rose-dark uppercase">
          Scrunchies By The Bunch
        </p>

        <h1 className="mt-2 max-w-[18rem] shrink-0 text-center font-display text-[1.45rem] leading-tight font-semibold text-ink sm:max-w-sm sm:text-3xl">
          Your hair deserves the cutest scrunchies
        </h1>

        <p className="mt-2 max-w-xs shrink-0 text-center text-[13px] leading-snug text-ink/60">
          Soft girl energy, handmade pastels, and Pinterest-pretty vibes.
        </p>

        <div className="mt-5 w-full shrink-0">
          <Link to="/home" className="mb-3 block w-full">
            <Button size="lg" className="!block w-full py-2.5 shadow-lg shadow-rose/30">
              Explore Collection
            </Button>
          </Link>
          <Link to="/login" className="block w-full">
            <Button
              variant="outline"
              size="lg"
              className="!block w-full border-2 border-rose/35 bg-white/85 py-2.5"
            >
              Sign In
            </Button>
          </Link>
          <p className="mt-3 text-center text-xs text-ink/55">
            New here?{' '}
            <Link to="/signup" className="font-semibold text-rose-dark underline-offset-2 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
