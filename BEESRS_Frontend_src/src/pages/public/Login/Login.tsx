"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff } from "lucide-react"
import { useDispatch } from "react-redux"
import { loginSuccess, updateUserProfile } from "@/redux/authSlice"
import { login } from "@/services/authService"
import { ViewProfile as ViewProfileAPI } from "@/services/userService"
import { decodeJWT } from "@/utils/jwt"
import {  Link } from "react-router-dom"
import LoginLoadingScreen from "@/components/Transition/LoginLoadingScreen"

export default function Login() {
  // Form state
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showLoadingScreen, setShowLoadingScreen] = useState(false)

  // Redux and navigation
  const dispatch = useDispatch()

  // Handle loading screen completion (local component - App level will handle navigation)
  const handleLoadingComplete = () => {
    setShowLoadingScreen(false)
    // Navigation is handled at App level via localStorage flag
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await login(email, password)
      
      if (response.success && response.data) {
        const { accessToken, refreshToken, expiresAt, roleName, timezone } = response.data
        
        // Decode the JWT token
        const decodedToken = decodeJWT(accessToken)
        
        if (decodedToken) {
          // Store refreshToken and related data in localStorage
          localStorage.setItem('refreshToken', refreshToken)
          localStorage.setItem('expiresAt', expiresAt)
          localStorage.setItem('roleName', roleName)
          if (timezone) {
            localStorage.setItem('timezone', timezone)
          }
          
          // Set flag in localStorage to show loading screen at App level
          // This ensures it persists even if component unmounts
          localStorage.setItem('showLoginLoading', 'true')
          localStorage.setItem('pendingRoleName', roleName)
          
          // Show loading screen in this component too
          setShowLoadingScreen(true)
          
          // Use requestAnimationFrame to ensure loading screen renders
          requestAnimationFrame(() => {
            // Dispatch login success action after loading screen is shown
            dispatch(loginSuccess({
              accessToken,
              refreshToken,
              expiresAt,
              roleName,
              decodedToken
            }))
            
            // Load user profile data for header display (non-blocking)
            ViewProfileAPI()
              .then((profileResponse) => {
                if (profileResponse.success && profileResponse.data) {
                  dispatch(updateUserProfile({
                    firstName: profileResponse.data.firstName,
                    lastName: profileResponse.data.lastName,
                    fullName: profileResponse.data.fullName,
                    profilePictureUrl: profileResponse.data.profile?.profilePictureUrl || null
                  }))
                }
              })
              .catch((profileError) => {
                // Don't block login if profile loading fails
                console.error("Profile loading error:", profileError)
              })
          })
        } else {
          setError("Failed to decode authentication token")
        }
      } else {
        setError(response.message || "Login failed")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      setError(error.response?.data?.message || error.message || "An error occurred during login")
    } finally {
      setIsLoading(false)
    }
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to your account to continue</p>
          </div>

          <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
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
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 backdrop-blur-sm border border-white/20 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30 transition-all duration-300 shadow-sm"
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                  }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 rounded text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500 transition-colors">
                Forgot your password?
              </Link>
            </div>

            {/* Sign In Button */}
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
              <span className="relative z-10">{isLoading ? "Signing in..." : "Sign In"}</span>
            </motion.button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center relative z-10">
            <p className="text-gray-600 text-sm">
              Don't have an account?{" "}
              <Link to="/register" className="text-blue-600 hover:text-blue-500 font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Loading Screen */}
      {showLoadingScreen && (
        <LoginLoadingScreen 
          onComplete={handleLoadingComplete}
          duration={2000}
          show={showLoadingScreen}
        />
      )}
    </div>
  )
}
