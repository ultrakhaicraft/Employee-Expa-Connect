// Gradient color variations for buttons and UI elements
export const gradientStyles = {
  // Primary gradients (purple to blue)
  primary: {
    default: 'bg-gradient-to-r from-purple-400 to-blue-400',
    hover: 'hover:from-purple-500 hover:to-blue-500',
    disabled: 'disabled:from-purple-300 disabled:to-blue-300'
  },
  
  // Secondary gradients (pink to purple)
  secondary: {
    default: 'bg-gradient-to-r from-pink-400 to-purple-400',
    hover: 'hover:from-pink-500 hover:to-purple-500',
    disabled: 'disabled:from-pink-300 disabled:to-purple-300'
  },
  
  // Success gradients (green to teal)
  success: {
    default: 'bg-gradient-to-r from-green-400 to-teal-400',
    hover: 'hover:from-green-500 hover:to-teal-500',
    disabled: 'disabled:from-green-300 disabled:to-teal-300'
  },
  
  // Warning gradients (orange to red)
  warning: {
    default: 'bg-gradient-to-r from-orange-400 to-red-400',
    hover: 'hover:from-orange-500 hover:to-red-500',
    disabled: 'disabled:from-orange-300 disabled:to-red-300'
  },
  
  // Info gradients (cyan to blue)
  info: {
    default: 'bg-gradient-to-r from-cyan-400 to-blue-400',
    hover: 'hover:from-cyan-500 hover:to-blue-500',
    disabled: 'disabled:from-cyan-300 disabled:to-blue-300'
  },
  
  // Accent gradients (indigo to purple)
  accent: {
    default: 'bg-gradient-to-r from-indigo-400 to-purple-400',
    hover: 'hover:from-indigo-500 hover:to-purple-500',
    disabled: 'disabled:from-indigo-300 disabled:to-purple-300'
  }
}

// Common button styles with gradients
export const gradientButtonStyles = {
  base: 'text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-0',
  primary: `${gradientStyles.primary.default} ${gradientStyles.primary.hover} ${gradientStyles.primary.disabled}`,
  secondary: `${gradientStyles.secondary.default} ${gradientStyles.secondary.hover} ${gradientStyles.secondary.disabled}`,
  success: `${gradientStyles.success.default} ${gradientStyles.success.hover} ${gradientStyles.success.disabled}`,
  warning: `${gradientStyles.warning.default} ${gradientStyles.warning.hover} ${gradientStyles.warning.disabled}`,
  info: `${gradientStyles.info.default} ${gradientStyles.info.hover} ${gradientStyles.info.disabled}`,
  accent: `${gradientStyles.accent.default} ${gradientStyles.accent.hover} ${gradientStyles.accent.disabled}`
}

// Helper function to get complete button class
export const getGradientButtonClass = (variant: keyof typeof gradientButtonStyles = 'primary') => {
  return `${gradientButtonStyles.base} ${gradientButtonStyles[variant]}`
}

