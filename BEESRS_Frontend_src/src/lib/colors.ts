// Color Palette for Beesrs Application
// Based on homepage linear gradients and modern design principles

export const colors = {
  // Primary Brand Colors (from homepage gradients)
  primary: {
    // Main gradient: purple-400 to blue-400
    from: '#a855f7', // purple-400
    to: '#60a5fa',   // blue-400
    // Hover states
    fromHover: '#9333ea', // purple-500
    toHover: '#3b82f6',   // blue-500
  },

  // Secondary Brand Colors
  secondary: {
    // Secondary gradient: pink-400 to purple-400
    from: '#f472b6', // pink-400
    to: '#a855f7',   // purple-400
    // Hover states
    fromHover: '#ec4899', // pink-500
    toHover: '#9333ea',   // purple-500
  },

  // Accent Colors
  accent: {
    // Cyan to blue gradient (for special elements)
    from: '#22d3ee', // cyan-400
    to: '#60a5fa',   // blue-400
    // Hover states
    fromHover: '#06b6d4', // cyan-500
    toHover: '#3b82f6',   // blue-500
  },

  // Neutral Colors
  neutral: {
    // Background colors
    background: {
      primary: '#ffffff',   // white
      secondary: '#f9fafb', // gray-50
      tertiary: '#f3f4f6',  // gray-100
    },
    // Text colors
    text: {
      primary: '#111827',   // gray-900
      secondary: '#6b7280', // gray-500
      tertiary: '#9ca3af',  // gray-400
      muted: '#d1d5db',     // gray-300
    },
    // Border colors
    border: {
      primary: '#e5e7eb',   // gray-200
      secondary: '#d1d5db', // gray-300
      focus: '#3b82f6',     // blue-500
    }
  },

  // Status Colors
  status: {
    success: {
      primary: '#10b981',   // emerald-500
      light: '#d1fae5',     // emerald-100
    },
    warning: {
      primary: '#f59e0b',   // amber-500
      light: '#fef3c7',     // amber-100
    },
    error: {
      primary: '#ef4444',   // red-500
      light: '#fee2e2',     // red-100
    },
    info: {
      primary: '#3b82f6',   // blue-500
      light: '#dbeafe',     // blue-100
    }
  },

  // Interactive Colors
  interactive: {
    // Active/Selected states
    active: {
      background: '#dbeafe', // blue-100
      text: '#1d4ed8',       // blue-700
      border: '#3b82f6',     // blue-500
    },
    // Hover states
    hover: {
      background: '#f3f4f6', // gray-100
      text: '#374151',       // gray-700
    }
  }
}

// CSS Classes for easy usage
export const colorClasses = {
  // Primary gradients
  primaryGradient: 'bg-gradient-to-r from-purple-400 to-blue-400',
  primaryGradientHover: 'hover:from-purple-500 hover:to-blue-500',
  
  // Secondary gradients
  secondaryGradient: 'bg-gradient-to-r from-pink-400 to-purple-400',
  secondaryGradientHover: 'hover:from-pink-500 hover:to-purple-500',
  
  // Accent gradients
  accentGradient: 'bg-gradient-to-r from-cyan-400 to-blue-400',
  accentGradientHover: 'hover:from-cyan-500 hover:to-blue-500',
  
  // Text gradients
  primaryTextGradient: 'bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent',
  secondaryTextGradient: 'bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent',
  
  // Status colors
  success: 'bg-emerald-500 text-white',
  warning: 'bg-amber-500 text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-blue-500 text-white',
  
  // Interactive states
  active: 'bg-blue-100 text-blue-700 border-blue-500',
  hover: 'hover:bg-gray-100 hover:text-gray-700',
}

// Common button styles
export const buttonStyles = {
  primary: `${colorClasses.primaryGradient} ${colorClasses.primaryGradientHover} text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300`,
  secondary: `${colorClasses.secondaryGradient} ${colorClasses.secondaryGradientHover} text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300`,
  accent: `${colorClasses.accentGradient} ${colorClasses.accentGradientHover} text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300`,
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300',
  ghost: 'text-gray-700 hover:bg-gray-100 transition-all duration-300',
}

// Common input styles
export const inputStyles = {
  default: 'bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg transition-all duration-300',
  error: 'bg-red-50 border-red-300 focus:border-red-500 focus:ring-red-500 rounded-lg transition-all duration-300',
  success: 'bg-emerald-50 border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg transition-all duration-300',
}

// Common card styles
export const cardStyles = {
  default: 'bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300',
  elevated: 'bg-white border border-gray-200 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300',
  interactive: 'bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 cursor-pointer',
}

export default colors

