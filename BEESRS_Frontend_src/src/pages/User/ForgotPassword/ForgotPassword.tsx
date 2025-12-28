"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { forgotPassword } from '@/services/userService'
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setMessage("")
    setIsSuccess(false)

    try {
      const response = await forgotPassword(email)
      
      if (response.success) {
        setMessage(response.data || "If your email is registered, you will receive a password reset link shortly.")
        setIsSuccess(true)
      } else {
        setError(response.message || "An error occurred")
      }
    } catch (error: any) {
      console.error("Forgot password error:", error)
      setError(error.response?.data?.message || error.message || "An error occurred while sending reset email")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    navigate('/login')
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Background gradient shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center p-4">
        <motion.div
          className="w-full max-w-md p-8 backdrop-blur-md rounded-3xl shadow-2xl relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          }}
        >
          {/* Glass effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/3 rounded-3xl"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/3 to-transparent rounded-3xl"></div>

          {/* Logo */}
          <div className="text-center mb-6 relative z-10">
            <Link to="/" className="inline-flex items-center space-x-3 hover:opacity-80 transition-all duration-300 hover:scale-105 group">
              <motion.img 
                src="/logo.png" 
                alt="Beesrs Logo" 
                className="w-10 h-10 object-contain group-hover:rotate-12 transition-transform duration-300"
              />
              <span className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">Beesrs</span>
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-8 relative z-10">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Mail className="w-7 h-7 text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
            <p className="text-gray-600">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <div className="relative z-10">
            {!isSuccess ? (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 backdrop-blur-sm border border-white/20 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30 transition-all duration-300 shadow-sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                      }}
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {/* Primary Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 relative overflow-hidden group"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(147, 51, 234, 0.9) 50%, rgba(236, 72, 153, 0.9) 100%)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }}
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative z-10">{isLoading ? "Sending..." : "Send Reset Link"}</span>
                </motion.button>

                {/* Back to Login */}
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full mt-2 py-3 text-sm font-medium text-gray-700 bg-white/60 hover:bg-white rounded-xl border border-gray-200 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </button>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-6"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">Check Your Email</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {message}
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={handleBackToLogin}
                    className="w-full py-3 text-white font-semibold rounded-xl transition-all duration-300 relative overflow-hidden group"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(147, 51, 234, 0.9) 50%, rgba(34, 197, 94, 0.9) 100%)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Back to Login
                    </span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsSuccess(false)
                      setEmail("")
                      setMessage("")
                    }}
                    className="w-full py-3 text-sm font-medium text-gray-700 bg-white/70 hover:bg-white rounded-xl border border-gray-200 transition-all duration-300"
                  >
                    Try Another Email
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}