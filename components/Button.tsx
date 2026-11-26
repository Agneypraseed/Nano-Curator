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
  type = 'button',
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold leading-tight transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "border-plum-700 bg-plum-700 text-white hover:border-plum-800 hover:bg-plum-800",
    secondary: "border-stone-300 bg-white text-stone-950 hover:bg-stone-100",
    outline: "border-plum-600 bg-transparent text-plum-700 hover:bg-plum-50 hover:text-plum-900"
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <svg aria-hidden="true" className="size-4 shrink-0 animate-spin text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
