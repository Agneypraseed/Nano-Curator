import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
  loadingLabel?: string;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  loadingLabel = 'Processing',
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex min-h-11 items-center justify-center gap-2 border px-6 py-3 text-base font-semibold rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "border-teal-700 text-white bg-teal-700 hover:border-teal-800 hover:bg-teal-800 focus:ring-teal-600 shadow-[0_10px_24px_-12px_rgba(15,118,110,0.85)] hover:shadow-[0_14px_28px_-12px_rgba(15,118,110,0.9)]",
    secondary: "border-stone-200 text-stone-900 bg-white hover:border-stone-300 hover:bg-stone-50 focus:ring-stone-300 shadow-sm",
    outline: "border-stone-300 text-stone-800 bg-white hover:border-teal-600 hover:bg-teal-50 hover:text-teal-900 focus:ring-teal-500 shadow-sm"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingLabel}...
        </>
      ) : children}
    </button>
  );
};

export default Button;
