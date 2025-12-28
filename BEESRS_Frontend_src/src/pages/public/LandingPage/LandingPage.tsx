import { motion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  Sparkles,
  MapPin,
  Users,
  Compass,
  Filter,
  Calendar,
  Route,
  MessageSquare,
  ArrowRight,
  Globe,
  Zap,
  Star,
  Shield,
  TrendingUp
} from 'lucide-react'

const MotionLink = motion.create(Link)

const stats = [
  { label: 'Countries supported', value: '35+', icon: Globe },
  { label: 'Verified places', value: '4k+', icon: MapPin },
  { label: 'Community events', value: '1.2k', icon: Calendar }
]

const systemFeatures = [
  {
    icon: MapPin,
    badge: 'Location Intelligence',
    title: 'Place Recommendations & Reviews',
    description: 'Submit new places, leave structured reviews, and surface verified hotspots curated by Broadcom peers.',
    checklist: ['Add new locations instantly', 'Rate & evaluate experiences', 'Surface insider tips'],
    imageUrl: 'https://i.pinimg.com/1200x/69/dd/41/69dd41937cb15b54e6c10782a15d833a.jpg',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Filter,
    badge: 'Interactive Search',
    title: 'Search & Map Filters',
    description: 'Apply precision filters, execute geo-search, and explore map overlays that highlight what matters most.',
    checklist: ['Advanced filtering', 'Instant search feedback', 'Map-first browsing'],
    imageUrl: 'https://i.pinimg.com/1200x/e7/0c/28/e70c2855fcaa37402c96ea1d02411740.jpg',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: Calendar,
    badge: 'Group Collaboration',
    title: 'Group Event Planning',
    description: 'Spin up group events, let AI suggest venues, and invite teammates with a frictionless RSVP flow.',
    checklist: ['Create social or work events', 'AI venue recommendations', 'Smart invitations & reminders'],
    imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
    gradient: 'from-indigo-500 to-purple-500'
  },
  {
    icon: Route,
    badge: 'Personal Productivity',
    title: 'Personal Itinerary Builder',
    description: 'Craft day-by-day itineraries, add destinations, then save and share plans with fellow expats.',
    checklist: ['Drag-and-drop schedule', 'Destination attachments', 'Shareable itineraries'],
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    gradient: 'from-emerald-500 to-teal-500'
  },
  {
    icon: MessageSquare,
    badge: 'AI Recommendation',
    title: 'AI Chatbot Concierge',
    description: 'Converse with an AI teammate that understands Broadcom workflows and local nuances.',
    checklist: ['Instant Q&A', 'Context-aware suggestions', 'Actionable follow-ups'],
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    gradient: 'from-violet-500 to-fuchsia-500'
  },
  {
    icon: Users,
    badge: 'Community Trust',
    title: 'Social Activity Hub',
    description: 'Discover teammates nearby, coordinate meetups, and sustain culture across borders.',
    checklist: ['Verified employee network', 'Liquid glass social cards', 'Secure interactions'],
    imageUrl: 'https://i.pinimg.com/1200x/67/41/72/6741728a377a1c844258db4e7a06c289.jpg',
    gradient: 'from-rose-500 to-pink-500'
  }
]

const planningTimeline = [
  { label: 'Step 01', title: 'Create group event', detail: 'Define purpose, schedule, and participation rules.', icon: Calendar },
  { label: 'Step 02', title: 'AI proposes venues', detail: 'Receive curated venue matches based on team preferences.', icon: Sparkles },
  { label: 'Step 03', title: 'Invite & collaborate', detail: 'Share links, chat in context, and finalize logistics.', icon: Users }
]

const benefits = [
  {
    icon: Shield,
    title: 'Culture-ready onboarding',
    description: 'Tailored city guides, etiquette tips, and curated itineraries built for Broadcom expats.'
  },
  {
    icon: Users,
    title: 'Community-powered',
    description: 'Tap into a verified network of colleagues for recommendations and spontaneous meetups.'
  },
  {
    icon: Zap,
    title: 'AI-driven insights',
    description: 'Smart recommendations powered by machine learning to enhance your relocation experience.'
  },
  {
    icon: TrendingUp,
    title: 'Continuous growth',
    description: 'Evolving platform that adapts to your needs and the global Broadcom community.'
  }
]

// Particle component for background effects
const Particle = ({ delay = 0 }: { delay?: number }) => {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-sky-400 to-violet-400 opacity-30"
      initial={{ y: 0, x: 0, opacity: 0 }}
      animate={{
        y: [0, -100, -200],
        x: [0, Math.random() * 100 - 50],
        opacity: [0, 0.5, 0],
        scale: [0, 1, 0]
      }}
      transition={{
        duration: 5 + Math.random() * 3,
        delay,
        repeat: Infinity,
        ease: 'easeOut'
      }}
    />
  )
}

export default function LandingPage() {
  const { scrollYProgress } = useScroll()
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const heroRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
      }
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-slate-100 overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <Particle key={i} delay={i * 0.3} />
        ))}
      </div>

      {/* Animated gradient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -left-20 top-20 w-96 h-96 bg-gradient-to-br from-sky-500/30 via-cyan-400/20 to-transparent rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        <motion.div
          className="absolute -right-28 bottom-32 w-96 h-96 bg-gradient-to-br from-pink-500/30 via-purple-400/25 to-transparent rounded-full blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1
          }}
        />
        <motion.div
          className="absolute left-1/2 top-1/3 w-72 h-72 bg-gradient-to-br from-blue-500/20 via-indigo-400/15 to-transparent rounded-full blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, -40, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-6 lg:px-12 py-8"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-400 via-violet-500 to-pink-500 blur-md opacity-75"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.75, 0.9, 0.75]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
                <div className="relative rounded-2xl px-5 py-2.5 text-xl font-display-bold tracking-wide text-slate-50 shadow-[0_14px_45px_rgba(56,189,248,0.7)]">
                  BEESRS
                </div>
              </div>
              <p className="text-sm font-body-readable text-slate-300">Broadcom Employee Engagement</p>
            </div>
          </motion.div>

          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex flex-wrap items-center gap-3 text-sm"
          >
            {['Discover', 'Connect', 'Plan'].map((item, index) => (
              <motion.span
                key={item}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="px-4 py-2 rounded-full glass-effect text-slate-100 cursor-pointer transition-smooth hover:bg-white/20"
              >
                {item}
              </motion.span>
            ))}
            <MotionLink
              to="/login"
              className="inline-flex items-center gap-2 rounded-full glass-effect-strong px-6 py-2.5 font-elegant-body text-slate-50 shadow-lg hover:shadow-xl transition-smooth"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              Sign In
              <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
            </MotionLink>
          </motion.nav>
        </motion.header>

        <main className="px-6 lg:px-12 pb-24 space-y-24">
          {/* Hero Section */}
          <motion.section
            ref={heroRef}
            style={{ scale, opacity }}
            className="relative overflow-hidden rounded-[48px] glass-effect-dark px-6 py-12 lg:px-16 lg:py-20 shadow-2xl"
          >
            <div className="absolute inset-0 pointer-events-none">
              <motion.div
                className="absolute -left-24 top-0 w-[420px] h-[420px] bg-gradient-to-br from-sky-500/30 via-cyan-400/20 to-transparent blur-3xl"
                animate={{
                  x: [0, 30, 0],
                  y: [0, 20, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
              <motion.div
                className="absolute -right-12 bottom-0 w-[360px] h-[360px] bg-gradient-to-br from-pink-500/30 via-purple-400/25 to-transparent blur-3xl"
                animate={{
                  x: [0, -30, 0],
                  y: [0, -20, 0],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 18,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 1
                }}
              />
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="relative grid gap-12 lg:grid-cols-[1.15fr_0.85fr] items-center"
            >
              <motion.div variants={itemVariants} className="space-y-8">
                <motion.div
                  variants={itemVariants}
                  className="flex flex-wrap gap-3"
                >
                  <motion.span
                    whileHover={{ scale: 1.05, x: 5 }}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500/20 to-violet-500/20 backdrop-blur-xl px-5 py-2.5 text-xs font-elegant-body uppercase tracking-wider text-slate-100 border border-white/10"
                  >
                    <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
                    Built for expats
                  </motion.span>
                  <motion.span
                    whileHover={{ scale: 1.05, x: 5 }}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl px-5 py-2.5 text-xs font-elegant-body uppercase tracking-wider text-slate-100 border border-white/10"
                  >
                    Seamless onboarding
                  </motion.span>
                </motion.div>

                <motion.h1
                  variants={itemVariants}
                  className="text-5xl md:text-6xl lg:text-7xl font-display-bold leading-tight text-slate-50"
                >
                  <span className="block">Discover places,</span>
                  <span className="block text-gradient-animated">craft rituals,</span>
                  <span className="block">and feel anchored</span>
                  <span className="block">anywhere Broadcom</span>
                  <span className="block">sends you.</span>
                </motion.h1>

                <motion.p
                  variants={itemVariants}
                  className="text-lg font-body-readable text-slate-200 leading-relaxed max-w-2xl"
                >
                  <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-violet-300 to-pink-300">
                    BEESRS (Broadcom Employee Engagement & Social Recommendation System)
                  </span>{' '}
                  blends hyper-local discovery with social planning, ensuring every relocation starts with confidence, community,
                  and AI-backed guidance.
                </motion.p>

                <motion.div
                  variants={itemVariants}
                  className="grid gap-4 text-slate-100 md:grid-cols-2"
                >
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="rounded-2xl glass-effect p-6 backdrop-blur-xl border border-white/10"
                  >
                    <h4 className="text-sm font-elegant-heading uppercase tracking-wider text-slate-300 mb-4">
                      What you get
                    </h4>
                    <ul className="space-y-3 text-sm font-body-readable text-slate-100/90">
                      {['Personalised place intelligence', 'Social activity orchestration', 'AI copilots for every workflow'].map((item, i) => (
                        <motion.li
                          key={item}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + i * 0.1 }}
                          className="flex items-center gap-3"
                        >
                          <motion.span
                            className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-sky-400 to-violet-400 shadow-lg"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                          />
                          {item}
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="rounded-2xl glass-effect p-6 backdrop-blur-xl border border-white/10"
                  >
                    <h4 className="text-sm font-elegant-heading uppercase tracking-wider text-slate-300 mb-4">
                      How it helps
                    </h4>
                    <p className="text-sm font-body-readable text-slate-100/90 leading-relaxed">
                      Land with curated itineraries, keep your cultural rhythm with teammate-hosted experiences, and let AI handle
                      the logistics so you stay focused on impact.
                    </p>
                  </motion.div>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="flex flex-wrap gap-4"
                >
                  <MotionLink
                    to="/register"
                    className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-pink-500 font-elegant-heading text-white shadow-xl hover:shadow-2xl transition-smooth relative overflow-hidden"
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      Start Exploring
                      <Compass className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    </span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-sky-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      animate={{
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'linear'
                      }}
                    />
                  </MotionLink>
                  <MotionLink
                    to="/login"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl glass-effect-strong font-elegant-body text-slate-50 shadow-lg hover:shadow-xl transition-smooth"
                    whileHover={{ scale: 1.02, y: -3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    I already have access
                    <ArrowRight className="w-4 h-4" />
                  </MotionLink>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="grid gap-4 pt-4 sm:grid-cols-3"
                >
                  {stats.map((stat, index) => {
                    const Icon = stat.icon
                    return (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2 + index * 0.1 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        className="rounded-2xl glass-effect p-6 text-slate-100 border border-white/10 backdrop-blur-xl"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="w-5 h-5 text-sky-400" />
                          <p className="text-3xl font-display-bold">{stat.value}</p>
                        </div>
                        <p className="text-xs font-elegant-body uppercase tracking-wider text-slate-300">{stat.label}</p>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                animate={{
                  x: mousePosition.x,
                  y: mousePosition.y
                }}
                transition={{
                  type: 'spring',
                  stiffness: 50,
                  damping: 20
                }}
                className="relative"
              >
                <motion.div
                  className="absolute -inset-6 rounded-[48px] bg-gradient-to-br from-sky-500/30 via-purple-500/30 to-pink-500/30 blur-3xl"
                  animate={{
                    opacity: [0.5, 0.8, 0.5],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
                <div className="relative rounded-[36px] bg-white/95 backdrop-blur-xl p-6 shadow-2xl border border-white/20">
                  <motion.div
                    className="rounded-2xl overflow-hidden"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <video
                      src="/video_home.mp4"
                      className="w-full h-[360px] object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  </motion.div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {benefits.slice(0, 2).map((benefit, index) => {
                      const Icon = benefit.icon
                      return (
                        <motion.div
                          key={benefit.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.5 + index * 0.1 }}
                          whileHover={{ scale: 1.05, y: -5 }}
                          className="rounded-2xl bg-gradient-to-br from-white to-slate-50 p-5 shadow-lg border border-slate-200"
                        >
                          <Icon className="w-6 h-6 text-sky-500 mb-3" />
                          <h3 className="text-lg font-elegant-heading text-slate-900 mb-2">{benefit.title}</h3>
                          <p className="text-sm font-body-readable text-slate-600 leading-relaxed">
                            {benefit.description}
                          </p>
                        </motion.div>
                      )
                    })}
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.7 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="mt-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 border border-white/10"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <motion.div
                        className="rounded-full bg-gradient-to-br from-pink-500 to-violet-500 p-2.5"
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles className="w-5 h-5" />
                      </motion.div>
                      <div>
                        <p className="text-sm font-elegant-body uppercase tracking-wider text-slate-300">Daily pulse</p>
                        <p className="text-base font-elegant-heading">Auto-curated rituals by city</p>
                      </div>
                    </div>
                    <p className="text-sm font-body-readable text-slate-200 leading-relaxed">
                      AI monitors teammates landing in the same region and recommends shared experiences (coffee walks, coworking
                      swaps, cultural orientation kits) to keep morale and belonging high.
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </motion.section>

          {/* Section 1: Life Abroad Header */}
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8 }}
            className="relative rounded-[48px] glass-effect-dark px-8 py-16 lg:px-16 lg:py-20 shadow-2xl overflow-hidden"
          >
            <div className="absolute inset-0 pointer-events-none">
              <motion.div
                className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-500/20 to-pink-500/20 rounded-full blur-3xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            </div>
            <div className="relative z-10 max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center space-y-6"
              >
                <motion.p
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="text-sm font-elegant-body tracking-wider text-slate-300 uppercase"
                >
                  Life abroad in frames
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-display-bold text-slate-50 leading-tight"
                >
                  See how Broadcom teams
                  <br />
                  <span className="text-gradient-animated">land, explore, and connect.</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="text-lg font-body-readable text-slate-300 max-w-3xl mx-auto leading-relaxed"
                >
                  From neighborhood coffees to weekend hikes—BEESRS weaves everyday moments into a shared global story.
                </motion.p>
              </motion.div>
            </div>
          </motion.section>

          {/* Section 2: First-week Coffee Walks - Detailed Card */}
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative rounded-[36px] overflow-hidden group cursor-pointer"
              >
                <motion.img
                  src="https://images.unsplash.com/photo-1532635241-17e820acc59f?auto=format&fit=crop&w=900&q=80"
                  loading="lazy"
                  alt="Colleagues having coffee in a new city"
                  className="w-full h-[500px] object-cover"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.8 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2 mb-3"
                  >
                    <motion.div
                      className="w-2 h-2 rounded-full bg-pink-400"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-xs font-elegant-body tracking-wider uppercase text-pink-300">Week 1 Experience</span>
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl md:text-4xl font-display-bold mb-4"
                  >
                    First-week coffee walks
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="text-base font-body-readable text-slate-100/90 leading-relaxed mb-6"
                  >
                    Discover local gems shared by teammates who were here before you. Every corner café becomes a connection point, every recommendation a bridge to belonging.
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap gap-2"
                  >
                    {['Local Cafés', 'Team Meetups', 'Hidden Gems'].map((tag, i) => (
                      <motion.span
                        key={tag}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        whileHover={{ scale: 1.1 }}
                        className="px-4 py-2 rounded-full glass-effect text-xs font-elegant-body text-slate-100"
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="space-y-6"
              >
                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-2xl glass-effect-strong p-8 border border-white/10"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Users className="w-6 h-6 text-white" />
                    </motion.div>
                    <h4 className="text-xl font-elegant-heading text-white">Connect with Colleagues</h4>
                  </div>
                  <p className="text-base font-body-readable text-slate-200/90 leading-relaxed">
                    Join weekly coffee walks organized by local Broadcom teams. It's your first step to building meaningful connections in your new city.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-2xl glass-effect-strong p-8 border border-white/10"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <MapPin className="w-6 h-6 text-white" />
                    </motion.div>
                    <h4 className="text-xl font-elegant-heading text-white">Discover Local Spots</h4>
                  </div>
                  <p className="text-base font-body-readable text-slate-200/90 leading-relaxed">
                    Get insider recommendations from verified Broadcom employees. Every place is vetted and reviewed by your peers.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-2xl glass-effect-strong p-8 border border-white/10"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Sparkles className="w-6 h-6 text-white" />
                    </motion.div>
                    <h4 className="text-xl font-elegant-heading text-white">AI-Powered Suggestions</h4>
                  </div>
                  <p className="text-base font-body-readable text-slate-200/90 leading-relaxed">
                    Our AI learns your preferences and suggests the perfect spots for your first week, making settling in effortless.
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </motion.section>

          {/* Section 3: Office Rhythms - Detailed Card */}
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="space-y-6 order-2 lg:order-1"
              >
                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-2xl glass-effect-strong p-8 border border-white/10"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Calendar className="w-6 h-6 text-white" />
                    </motion.div>
                    <h4 className="text-xl font-elegant-heading text-white">Flexible Workspaces</h4>
                  </div>
                  <p className="text-base font-body-readable text-slate-200/90 leading-relaxed">
                    Find and book coworking spaces, meeting rooms, and quiet corners that match your work style. All verified by Broadcom teams.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-2xl glass-effect-strong p-8 border border-white/10"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Zap className="w-6 h-6 text-white" />
                    </motion.div>
                    <h4 className="text-xl font-elegant-heading text-white">Productivity Boost</h4>
                  </div>
                  <p className="text-base font-body-readable text-slate-200/90 leading-relaxed">
                    Maintain your productivity with curated spaces that support focus, collaboration, and innovation—wherever you are.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-2xl glass-effect-strong p-8 border border-white/10"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Route className="w-6 h-6 text-white" />
                    </motion.div>
                    <h4 className="text-xl font-elegant-heading text-white">Routine Optimization</h4>
                  </div>
                  <p className="text-base font-body-readable text-slate-200/90 leading-relaxed">
                    Build sustainable routines around trusted locations. Let AI help you optimize your daily flow for maximum impact.
                  </p>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative rounded-[36px] overflow-hidden group cursor-pointer order-1 lg:order-2"
              >
                <motion.img
                  src="https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=900&q=80"
                  loading="lazy"
                  alt="Team collaborating in an office abroad"
                  className="w-full h-[500px] object-cover"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.8 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2 mb-3"
                  >
                    <motion.div
                      className="w-2 h-2 rounded-full bg-cyan-400"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-xs font-elegant-body tracking-wider uppercase text-cyan-300">Work Life Balance</span>
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl md:text-4xl font-display-bold mb-4"
                  >
                    Office rhythms, reimagined
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="text-base font-body-readable text-slate-100/90 leading-relaxed mb-6"
                  >
                    Anchor your routines around trusted spaces to focus, meet, and recharge. Transform any location into your perfect workspace.
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap gap-2"
                  >
                    {['Coworking Spaces', 'Meeting Rooms', 'Quiet Zones'].map((tag, i) => (
                      <motion.span
                        key={tag}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        whileHover={{ scale: 1.1 }}
                        className="px-4 py-2 rounded-full glass-effect text-xs font-elegant-body text-slate-100"
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.section>

          {/* Section 4: Weekends That Feel Like Home - Detailed Card */}
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative rounded-[36px] overflow-hidden group cursor-pointer"
              >
                <motion.img
                  src="https://i.pinimg.com/736x/d2/ed/54/d2ed545e47ab2f657a248c9527082b0d.jpg"
                  loading="lazy"
                  alt="Group hiking together on a weekend"
                  className="w-full h-[500px] object-cover"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.8 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2 mb-3"
                  >
                    <motion.div
                      className="w-2 h-2 rounded-full bg-emerald-400"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-xs font-elegant-body tracking-wider uppercase text-emerald-300">Weekend Adventures</span>
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl md:text-4xl font-display-bold mb-4"
                  >
                    Weekends that feel like home
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="text-base font-body-readable text-slate-100/90 leading-relaxed mb-6"
                  >
                    Use curated itineraries to turn free time into shared adventures. From hiking trails to cultural events, make every weekend memorable.
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap gap-2"
                  >
                    {['Hiking Trails', 'Cultural Events', 'Group Activities'].map((tag, i) => (
                      <motion.span
                        key={tag}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        whileHover={{ scale: 1.1 }}
                        className="px-4 py-2 rounded-full glass-effect text-xs font-elegant-body text-slate-100"
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="space-y-6"
              >
                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-2xl glass-effect-strong p-8 border border-white/10"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Compass className="w-6 h-6 text-white" />
                    </motion.div>
                    <h4 className="text-xl font-elegant-heading text-white">Curated Itineraries</h4>
                  </div>
                  <p className="text-base font-body-readable text-slate-200/90 leading-relaxed">
                    Access pre-built weekend plans created by local Broadcom teams. From nature escapes to city explorations, find your perfect adventure.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-2xl glass-effect-strong p-8 border border-white/10"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Users className="w-6 h-6 text-white" />
                    </motion.div>
                    <h4 className="text-xl font-elegant-heading text-white">Group Adventures</h4>
                  </div>
                  <p className="text-base font-body-readable text-slate-200/90 leading-relaxed">
                    Join weekend activities organized by your colleagues. Build friendships while exploring your new city together.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-2xl glass-effect-strong p-8 border border-white/10"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Star className="w-6 h-6 text-white" />
                    </motion.div>
                    <h4 className="text-xl font-elegant-heading text-white">Memorable Moments</h4>
                  </div>
                  <p className="text-base font-body-readable text-slate-200/90 leading-relaxed">
                    Create lasting memories with experiences designed to help you feel at home, no matter where you are in the world.
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </motion.section>

          {/* Section 5: Scrolling Image Gallery */}
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-[48px] glass-effect-dark p-8 lg:p-12 shadow-2xl overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8"
            >
              <h3 className="text-3xl md:text-4xl font-display-bold text-slate-50 mb-4">
                Moments from around the world
              </h3>
              <p className="text-base font-body-readable text-slate-300 max-w-2xl mx-auto">
                See how Broadcom employees are making connections and creating memories in cities across the globe.
              </p>
            </motion.div>
            <div className="relative overflow-hidden">
              <motion.div
                className="flex gap-6"
                animate={{
                  x: [0, '-50%']
                }}
                transition={{
                  x: {
                    repeat: Infinity,
                    repeatType: 'loop',
                    duration: 50,
                    ease: 'linear'
                  }
                }}
              >
                {[
                  'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=900&q=80',
                  'https://i.pinimg.com/1200x/cd/f2/5c/cdf25c1974935f79e6c421086c73198b.jpg',
                  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
                  'https://i.pinimg.com/1200x/ad/2b/e1/ad2be1a8149c02d7b3d15e82960abef5.jpg',
                  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
                  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
                  'https://i.pinimg.com/736x/4c/e2/b6/4ce2b62e00b5f2e12bc12512e88d63e5.jpg',
                  'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?auto=format&fit=crop&w=900&q=80'
                ].map((src, index) => (
                  <motion.div
                    key={`${src}-${index}`}
                    className="min-w-[300px] rounded-2xl overflow-hidden bg-slate-900/50 flex-shrink-0 group cursor-pointer"
                    whileHover={{ y: -8, scale: 1.03 }}
                  >
                    <motion.img
                      src={src}
                      loading="lazy"
                      alt={`Gallery image ${index + 1}`}
                      className="h-48 w-full object-cover"
                      whileHover={{ scale: 1.15 }}
                      transition={{ duration: 0.6 }}
                    />
                  </motion.div>
                ))}
                {/* Duplicate for seamless loop */}
                {[
                  'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=900&q=80',
                  'https://i.pinimg.com/1200x/cd/f2/5c/cdf25c1974935f79e6c421086c73198b.jpg',
                  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
                  'https://i.pinimg.com/1200x/ad/2b/e1/ad2be1a8149c02d7b3d15e82960abef5.jpg',
                  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
                  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
                  'https://i.pinimg.com/736x/4c/e2/b6/4ce2b62e00b5f2e12bc12512e88d63e5.jpg',
                  'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?auto=format&fit=crop&w=900&q=80'
                ].map((src, index) => (
                  <motion.div
                    key={`${src}-dup-${index}`}
                    className="min-w-[300px] rounded-2xl overflow-hidden bg-slate-900/50 flex-shrink-0 group cursor-pointer"
                    whileHover={{ y: -8, scale: 1.03 }}
                  >
                    <motion.img
                      src={src}
                      loading="lazy"
                      alt={`Gallery image ${index + 1}`}
                      className="h-48 w-full object-cover"
                      whileHover={{ scale: 1.15 }}
                      transition={{ duration: 0.6 }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.section>

          {/* Core Features Section */}
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-4"
            >
              <p className="text-sm font-elegant-body tracking-wider text-slate-300 uppercase">
                Core feature pillars
              </p>
              <h2 className="text-4xl md:text-5xl font-display-bold text-slate-50">
                From discovery to execution—everything in one pane
              </h2>
              <p className="text-base font-body-readable text-slate-300 max-w-3xl mx-auto leading-relaxed">
                Each pillar mirrors the real relocation journey for Broadcom employees abroad—from scouting venues to coordinating teams and securing AI-backed support in one cohesive workspace.
              </p>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {systemFeatures.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -12, scale: 1.02 }}
                    className="group relative rounded-3xl overflow-hidden shadow-2xl cursor-pointer"
                    style={{
                      backgroundImage: `url(${feature.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 group-hover:from-slate-900/70 group-hover:via-slate-800/60 group-hover:to-slate-900/70 transition-all duration-500" />
                    <div className="relative z-10 p-8 backdrop-blur-[2px] h-full flex flex-col">
                      <div className="flex items-center gap-3 mb-4">
                        <motion.div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg`}
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </motion.div>
                        <span className="text-xs font-elegant-body uppercase tracking-wider text-slate-200/90">
                          {feature.badge}
                        </span>
                      </div>
                      <h3 className="text-2xl font-elegant-heading text-white mb-3 drop-shadow-lg">{feature.title}</h3>
                      <p className="text-sm font-body-readable text-slate-100/90 leading-relaxed mb-6 flex-grow">
                        {feature.description}
                      </p>
                      <ul className="space-y-2.5">
                        {feature.checklist.map((item, i) => (
                          <motion.li
                            key={item}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 + i * 0.05 }}
                            className="flex items-start gap-2.5 text-sm font-body-readable text-slate-100/80"
                          >
                            <motion.span
                              className="mt-1.5 h-2 w-2 rounded-full bg-gradient-to-r from-sky-300 to-violet-300 shadow-[0_0_10px_rgba(125,211,252,0.7)] flex-shrink-0"
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                            />
                            {item}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.section>

          {/* Interactive Features Section */}
          <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative rounded-[32px] overflow-hidden shadow-2xl group"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&w=1400&q=80')",
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-900/80 to-sky-900/50 group-hover:from-slate-950/85 group-hover:via-slate-900/75 group-hover:to-sky-900/45 transition-all duration-500" />
              <div className="relative z-10 p-8 backdrop-blur-[2px]">
                <div className="flex items-center gap-4 mb-6">
                  <motion.div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg"
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Filter className="w-7 h-7 text-white" />
                  </motion.div>
                  <div>
                    <p className="text-xs font-elegant-body tracking-wider uppercase text-slate-200/80">Search & map</p>
                    <h3 className="text-2xl font-elegant-heading text-white drop-shadow-lg">
                      Interactive filters & map overlays
                    </h3>
                  </div>
                </div>
                <p className="text-base font-body-readable text-slate-100/90 mb-6 max-w-xl leading-relaxed">
                  Customize filters the Broadcom way—combine vibe, amenities, budget, openness, or cultural tags and watch
                  the map glow in response with liquid-glass overlays.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  {['Apply smart filters', 'Execute instant search', 'Visualize layered results'].map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      whileHover={{ y: -6, scale: 1.02 }}
                      className="rounded-2xl glass-effect-dark p-5 shadow-lg backdrop-blur-xl border border-white/10"
                    >
                      <p className="text-sm font-elegant-heading text-slate-50 mb-2">{step}</p>
                      <p className="text-xs font-body-readable text-slate-200/80 leading-relaxed">
                        Watch the chips pulse in real time so you can feel the impact of every filter you apply.
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative rounded-[32px] glass-effect-strong p-8 shadow-2xl border border-white/20"
            >
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-pink-500/10 via-white/5 to-cyan-400/10 pointer-events-none" />
              <div className="relative flex items-center gap-4 mb-6">
                <motion.div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 shadow-lg"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Calendar className="w-7 h-7 text-white" />
                </motion.div>
                <div>
                  <p className="text-xs font-elegant-body tracking-wider uppercase text-slate-200">Group planning</p>
                  <h3 className="text-2xl font-elegant-heading text-white">Event creation timeline</h3>
                </div>
              </div>
              <div className="relative space-y-6">
                <div className="absolute inset-x-0 top-6 bottom-6 mx-8 border-l-2 border-gradient-to-b from-pink-400 to-cyan-400 border-pink-400/30" />
                {planningTimeline.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      whileHover={{ scale: 1.03, x: 10 }}
                      className="relative rounded-2xl glass-effect-dark p-5 shadow-lg backdrop-blur-xl border border-white/10"
                    >
                      <motion.span
                        className="absolute -left-12 top-6 h-5 w-5 rounded-full bg-gradient-to-br from-pink-400 to-sky-400 shadow-[0_0_20px_rgba(248,113,113,0.8)]"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                      />
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className="w-5 h-5 text-pink-400" />
                        <p className="text-xs font-elegant-body tracking-wider text-slate-200">{item.label}</p>
                      </div>
                      <h4 className="text-lg font-elegant-heading text-white mt-1 mb-2">{item.title}</h4>
                      <p className="text-sm font-body-readable text-slate-100/90 leading-relaxed">{item.detail}</p>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </section>

          {/* Final CTA Section */}
          <motion.section
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative text-center rounded-[32px] overflow-hidden shadow-2xl"
            style={{
              backgroundImage: "url('https://i.pinimg.com/736x/4e/3c/66/4e3c66fcb980fe0f908f21dc6fddf2db.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/85 to-slate-950/90" />
            <div className="relative z-10 px-6 py-16 md:px-10 md:py-20 max-w-4xl mx-auto">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-sm font-elegant-body tracking-wider uppercase text-slate-200 mb-4"
              >
                Ready to onboard
              </motion.p>
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-5xl font-display-bold text-white mt-3 mb-6 drop-shadow-lg"
              >
                Bring Broadcom culture anywhere in the world
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="text-base font-body-readable text-slate-100/90 mt-4 max-w-3xl mx-auto leading-relaxed mb-10"
              >
                BEESRS unifies discovery, community, event planning, and AI guidance so every Broadcomer abroad stays
                rooted in company culture—no matter the timezone.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center justify-center gap-4"
              >
                <MotionLink
                  to="/register"
                  className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-sky-400 via-blue-500 to-purple-500 font-elegant-heading text-white shadow-2xl hover:shadow-3xl transition-smooth relative overflow-hidden"
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Create Broadcom Life Abroad
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-sky-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                  />
                </MotionLink>
                <MotionLink
                  to="/login"
                  className="inline-flex items-center gap-2 px-10 py-5 rounded-2xl glass-effect-strong font-elegant-body text-slate-50 shadow-xl hover:shadow-2xl transition-smooth"
                  whileHover={{ scale: 1.02, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue where you left off
                  <ArrowRight className="w-4 h-4" />
                </MotionLink>
              </motion.div>
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  )
}
