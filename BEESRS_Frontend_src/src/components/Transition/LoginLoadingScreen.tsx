import React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { colors } from '@/lib/colors'

interface LoginLoadingScreenProps {
  onComplete?: () => void
  duration?: number
  show?: boolean
}

export const LoginLoadingScreen: React.FC<LoginLoadingScreenProps> = ({ 
  onComplete, 
  duration = 3000,
  show = true
}) => {
  React.useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, duration)
      return () => clearTimeout(timer)
    }
  }, [onComplete, duration, show])

  if (typeof document === 'undefined' || !show) {
    return null
  }

  const content = (
    <AnimatePresence mode="wait">
      <motion.div 
        className="fixed inset-0 flex items-center justify-center z-[9999] overflow-hidden" 
        style={{ background: `linear-gradient(135deg, #ffffff 0%, #f5f7fb 100%)` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full blur-3xl opacity-50"
            style={{
              width: 240,
              height: 240,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `radial-gradient(ellipse at center, ${colors.primary.from}30 0%, ${colors.primary.to}10 60%, transparent 70%)`
            }}
            animate={{
              x: [ -30, 30, -30 ],
              y: [ 20, -20, 20 ],
              rotate: [0, 15, 0]
            }}
            transition={{ duration: 8 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
          />
        ))}
      </div>

      <div
        className="relative z-10 w-[380px] max-w-[90%] rounded-2xl p-8 shadow-2xl"
        style={{
          background: `linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0.18))`,
          border: `1px solid ${colors.primary.to}30`,
          backdropFilter: 'blur(14px)'
        }}
      >
        <motion.div
          className="mx-auto mb-6 w-24 h-24 rounded-2xl relative"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.8 }}
          style={{
            background: `linear-gradient(135deg, ${colors.primary.from} 0%, ${colors.primary.to} 100%)`,
            boxShadow: `0 12px 40px ${colors.primary.to}40, inset 0 0 20px #ffffff40`
          }}
        >
          <div className="absolute inset-0 rounded-2xl" style={{ border: '1px solid #ffffff55' }} />
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.0))' }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-white text-3xl font-bold">B</span>
        </motion.div>

        <motion.h2
          className="text-center text-3xl font-semibold mb-4"
          style={{
            background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Beesrs
        </motion.h2>

        <motion.div
          className="h-2 w-full rounded-full overflow-hidden mb-3"
          style={{ background: '#ffffff80', border: `1px solid ${colors.primary.to}26` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="h-full"
            style={{
              background: `linear-gradient(90deg, ${colors.primary.from}, ${colors.primary.to})`,
              boxShadow: `0 0 14px ${colors.primary.to}66`
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        <motion.p
          className="text-center text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          Preparing your experience...
        </motion.p>
      </div>
    </motion.div>
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}

export default LoginLoadingScreen
