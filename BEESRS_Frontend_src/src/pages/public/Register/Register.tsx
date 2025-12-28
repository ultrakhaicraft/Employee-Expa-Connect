 "use client"

 import type React from "react"
 import { useState } from "react"
 import { motion } from "framer-motion"
 import { Eye, EyeOff } from "lucide-react"
 import { register } from "@/services/authService"
 import ConfirmOTP from "./ConfirmOTP"
 import { Link } from "react-router-dom"

 export default function Register() {
   // Form state
   const [formData, setFormData] = useState({
     email: "",
     password: "",
     confirmPassword: "",
     firstName: "",
     lastName: "",
     employeeCode: "",
     phoneNumber: ""
   })
   const [showPassword, setShowPassword] = useState(false)
   const [showConfirmPassword, setShowConfirmPassword] = useState(false)
   const [isLoading, setIsLoading] = useState(false)
   const [error, setError] = useState("")
   const [showOTPPopup, setShowOTPPopup] = useState(false)
   const [registeredEmail, setRegisteredEmail] = useState("")
   

   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
     const { name, value } = e.target
     setFormData(prev => ({
       ...prev,
       [name]: value
     }))
     if (error) setError("")
   }

   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault()

     // Basic validation
     if (formData.password !== formData.confirmPassword) {
       setError("Passwords do not match")
       return
     }

     if (formData.password.length < 6) {
       setError("Password must be at least 6 characters long")
       return
     }

     setIsLoading(true)
     setError("")

     try {
       // JobTitle will be automatically filled from Employee on backend
       await register({
         ...formData,
         jobTitle: "" // Backend will ignore this and use Employee's jobTitle
       })
       setRegisteredEmail(formData.email)
       setShowOTPPopup(true)
     } catch (error: any) {
       setError(error.response?.data?.message || "Registration failed. Please try again.")
     } finally {
       setIsLoading(false)
     }
   }

   const handleOTPSuccess = () => {
     // Redirect to login page or show success message
     window.location.href = "/login"
   }

   return (
     <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
       {/* Background gradient shapes - same style as Login */}
       <div className="absolute inset-0 overflow-hidden">
         <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
         <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
         <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
       </div>

      <div className="relative z-10 flex min-h-screen w-full items-center justify-center p-4">
         <motion.div
          className="w-full max-w-xl px-8 py-4 backdrop-blur-md rounded-3xl shadow-2xl relative overflow-hidden"
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
           
          {/* Logo - same as Login */}
          <div className="text-center mb-4 relative z-10">
             <Link to="/" className="inline-flex items-center space-x-3 hover:opacity-80 transition-all duration-300 hover:scale-105 group">
               <motion.img 
                 src="/logo.png" 
                 alt="Beesrs Logo" 
                 className="w-10 h-10 object-contain group-hover:rotate-12 transition-transform duration-300"
               />
               <span className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">Beesrs</span>
             </Link>
           </div>

          {/* Header - adapted text for Register */}
          <div className="text-center mb-6 relative z-10">
             <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
             <p className="text-gray-600">Join us and start your journey</p>
           </div>

          <form className="space-y-3 relative z-10" onSubmit={handleSubmit}>
             {/* Error Message - same style as Login */}
             {error && (
               <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                 <p className="text-red-600 text-sm">{error}</p>
               </div>
             )}

             {/* Name Fields */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                   First Name
                 </label>
                 <div className="relative">
                   <input
                     id="firstName"
                     name="firstName"
                     type="text"
                     value={formData.firstName}
                     onChange={handleInputChange}
                     required
                      className="w-full px-4 py-2.5 backdrop-blur-sm border border-white/20 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30 transition-all duration-300 shadow-sm"
                     style={{
                       background: 'rgba(255, 255, 255, 0.15)',
                       border: '1px solid rgba(255, 255, 255, 0.2)',
                       boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                     }}
                     placeholder="John"
                   />
                 </div>
               </div>
               <div>
                 <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                   Last Name
                 </label>
                 <div className="relative">
                   <input
                     id="lastName"
                     name="lastName"
                     type="text"
                     value={formData.lastName}
                     onChange={handleInputChange}
                     required
                     className="w-full px-4 py-2.5 backdrop-blur-sm border border-white/20 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30 transition-all duration-300 shadow-sm"
                     style={{
                       background: 'rgba(255, 255, 255, 0.15)',
                       border: '1px solid rgba(255, 255, 255, 0.2)',
                       boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                     }}
                     placeholder="Doe"
                   />
                 </div>
               </div>
             </div>

             {/* Email Field - same styling as Login email */}
             <div>
               <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                 Email Address
               </label>
               <div className="relative">
                  <input
                   id="email"
                   name="email"
                   type="email"
                   value={formData.email}
                   onChange={handleInputChange}
                   required
                   className="w-full px-4 py-2.5 backdrop-blur-sm border border-white/20 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30 transition-all duration-300 shadow-sm"
                   style={{
                     background: 'rgba(255, 255, 255, 0.15)',
                     border: '1px solid rgba(255, 255, 255, 0.2)',
                     boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                   }}
                   placeholder="john.doe@example.com"
                 />
               </div>
             </div>

             {/* Password Fields */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                   Password
                 </label>
                 <div className="relative">
                   <input
                     id="password"
                     name="password"
                     type={showPassword ? "text" : "password"}
                     value={formData.password}
                     onChange={handleInputChange}
                     required
                     className="w-full px-4 py-2.5 pr-12 backdrop-blur-sm border border-white/20 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30 transition-all duration-300 shadow-sm"
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
                     {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                   </button>
                 </div>
               </div>
               <div>
                 <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                   Confirm Password
                 </label>
                 <div className="relative">
                   <input
                     id="confirmPassword"
                     name="confirmPassword"
                     type={showConfirmPassword ? "text" : "password"}
                     value={formData.confirmPassword}
                     onChange={handleInputChange}
                     required
                     className="w-full px-4 py-2.5 pr-12 backdrop-blur-sm border border-white/20 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30 transition-all duration-300 shadow-sm"
                     style={{
                       background: 'rgba(255, 255, 255, 0.15)',
                       border: '1px solid rgba(255, 255, 255, 0.2)',
                       boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                     }}
                     placeholder="Re-enter your password"
                   />
                   <button
                     type="button"
                     onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                     className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                   >
                     {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                   </button>
                 </div>
               </div>
             </div>

             {/* Work Information */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label htmlFor="employeeCode" className="block text-sm font-medium text-gray-700 mb-2">
                   Employee Code
                 </label>
                 <div className="relative">
                   <input
                     id="employeeCode"
                     name="employeeCode"
                     type="text"
                     value={formData.employeeCode}
                     onChange={handleInputChange}
                     required
                     className="w-full px-4 py-2.5 backdrop-blur-sm border border-white/20 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30 transition-all duration-300 shadow-sm"
                     style={{
                       background: 'rgba(255, 255, 255, 0.15)',
                       border: '1px solid rgba(255, 255, 255, 0.2)',
                       boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                     }}
                     placeholder="BRC-12345"
                   />
                 </div>
               </div>
               <div>
                 <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                   Phone Number
                 </label>
                 <div className="relative">
                   <input
                     id="phoneNumber"
                     name="phoneNumber"
                     type="tel"
                     value={formData.phoneNumber}
                     onChange={handleInputChange}
                     required
                     className="w-full px-4 py-2.5 backdrop-blur-sm border border-white/20 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30 transition-all duration-300 shadow-sm"
                     style={{
                       background: 'rgba(255, 255, 255, 0.15)',
                       border: '1px solid rgba(255, 255, 255, 0.2)',
                       boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                     }}
                     placeholder="+84 912 345 678"
                   />
                 </div>
               </div>
             </div>

             {/* Submit Button - same style as Login button */}
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
               <span className="relative z-10">{isLoading ? "Creating account..." : "Create Account"}</span>
             </motion.button>
           </form>

           {/* Sign In Link - same placement style as Login Sign Up link */}
           <div className="mt-6 text-center relative z-10">
             <p className="text-gray-600 text-sm">
               Already have an account?{" "}
               <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium transition-colors">
                 Sign in
               </Link>
             </p>
           </div>
         </motion.div>
       </div>

       {/* OTP Verification Popup */}
       <ConfirmOTP
         isOpen={showOTPPopup}
         onClose={() => setShowOTPPopup(false)}
         email={registeredEmail}
         onSuccess={handleOTPSuccess}
       />
     </div>
   )
 }
