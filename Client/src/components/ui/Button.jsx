import {forwardRef} from 'react';

const variantStyles = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500',
  secondary: 'bg-secondary-400 text-white hover:bg-secondary-500 focus:ring-secondary-400',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800',
  ghost: 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
}

const sizeStyles = {
  sm: 'text-sm px-3 py-1.5 rounded-md',
  md: 'text-base px-4 py-2 rounded-md',
  lg: 'text-lg px-5 py-2.5 rounded-md'
};

export const Button = forwardRef(({
    variant = 'primary',
    size = 'md',
    className = '',
    disabled = false,
    children,
    ...props
}, ref) => {
    return(
        <button
         ref={ref}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center font-medium transition-colors
        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900
        ${variantStyles[variant]} ${sizeStyles[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      {...props}
        >
            {children}
        </button>
    )
})