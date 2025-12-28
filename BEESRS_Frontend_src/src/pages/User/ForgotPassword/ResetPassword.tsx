"use client"

import React, { useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, Mail, XCircle } from "lucide-react"
import { ResetPassword as ResetPasswordAPI } from "@/services/userService"

function useQueryParams() {
  const location = useLocation()
  return useMemo(() => new URLSearchParams(location.search), [location.search])
}

function ResetPassword() {
  const query = useQueryParams()
  const token = query.get("token") || ""
  const email = query.get("email") || ""
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordRules = (value: string) => ({
    lengthOk: value.length >= 8,
    firstUppercase: /^[A-Z].*/.test(value),
    hasNumber: /\d/.test(value),
    hasSpecial: /[^A-Za-z0-9]/.test(value),
  })
  const isPasswordValid = (value: string) => {
    const r = passwordRules(value)
    return r.lengthOk && r.firstUppercase && r.hasNumber && r.hasSpecial
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")

    if (!token || !email) {
      setError("Invalid or missing token/email. Please use the link from your email again.")
      return
    }
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.")
      return
    }
    if (!isPasswordValid(newPassword)) {
      setError("Password must be 8+ chars, start with uppercase, include a number and a special character.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    try {
      setIsLoading(true)
      const res = await ResetPasswordAPI(token, email, newPassword, confirmPassword)
      if (res?.success) {
        setIsSuccess(true)
        setSuccessMessage(res?.message || "Your password has been reset successfully.")
      } else {
        setError(res?.message || "Failed to reset password.")
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to reset password.")
    } finally {
      setIsLoading(false)
    }
  }

  const goToLogin = () => navigate("/login")

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Background gradient shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex min-h-screen w-full items-center justify-center p-2">
        <motion.div
          className="w-full max-w-md p-5 backdrop-blur-md rounded-3xl shadow-2xl relative overflow-hidden"
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

          {/* Header */}
          <div className="text-center mb-5 relative z-10">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Lock className="w-7 h-7 text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
            <p className="text-gray-600">
              Set a new password for your account.
            </p>
          </div>

          <div className="relative z-10">
            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email (read-only) */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <div className="relative">
                    <input
                      value={email}
                      disabled
                      className="w-full px-4 py-3 pr-10 backdrop-blur-sm border border-white/20 rounded-xl text-gray-700 placeholder-gray-400 bg-white/60 cursor-not-allowed"
                    />
                    <Mail className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Enter new password"
                      className="w-full px-4 py-3 pr-10 backdrop-blur-sm border border-white/20 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30 transition-all duration-300 shadow-sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                      }}
                      aria-invalid={newPassword ? (!isPasswordValid(newPassword)) : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-1.5 space-y-1 text-xs">
                    {(() => {
                      const r = passwordRules(newPassword)
                      const Item = ({ ok, label }: { ok: boolean; label: string }) => (
                        <div className={`${ok ? "text-green-600" : "text-red-500"} flex items-center gap-2`}>
                          {ok ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          <span>{label}</span>
                        </div>
                      )
                      return (
                        <div className="grid grid-cols-1 gap-1">
                          <Item ok={r.lengthOk} label="At least 8 characters" />
                          <Item ok={r.firstUppercase} label="Starts with an uppercase letter" />
                          <Item ok={r.hasNumber} label="Contains a number" />
                          <Item ok={r.hasSpecial} label="Contains a special character" />
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-enter new password"
                      className="w-full px-4 py-3 pr-10 backdrop-blur-sm border border-white/20 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30 transition-all duration-300 shadow-sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                      }}
                      aria-invalid={confirmPassword ? (confirmPassword !== newPassword) : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <div className={`mt-1 text-xs flex items-center gap-2 ${confirmPassword === newPassword ? "text-green-600" : "text-red-500"}`}>
                      {confirmPassword === newPassword ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{confirmPassword === newPassword ? "Passwords match" : "Passwords do not match"}</span>
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-red-600 text-sm">{error}</p>
                  </motion.div>
                )}

                {/* Actions */}
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
                  <span className="relative z-10">{isLoading ? "Resetting..." : "Reset Password"}</span>
                </motion.button>

                <button
                  type="button"
                  onClick={goToLogin}
                  className="w-full mt-2 py-3 text-sm font-medium text-gray-700 bg-white/60 hover:bg-white rounded-xl border border-gray-200 transition-all duration-300"
                >
                  Back to Login
                </button>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-5"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">Password Reset Successful</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{successMessage}</p>
                </div>
                <div className="space-y-2.5">
                  <button
                    onClick={goToLogin}
                    className="w-full py-3 text-white font-semibold rounded-xl transition-all duration-300 relative overflow-hidden group"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(147, 51, 234, 0.9) 50%, rgba(34, 197, 94, 0.9) 100%)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
                    }}
                  >
                    <span className="relative z-10">Go to Login</span>
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

export default ResetPassword