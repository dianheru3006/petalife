import type { FC, ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'mint' | 'peach';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button: FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

  const variantStyles = {
    primary: 'bg-[#FED7C5] hover:bg-[#FDC4AC] text-[#7A3613] shadow-sm hover:shadow active:bg-[#FCAE8F]',
    secondary: 'bg-[#F0EDF9] hover:bg-[#E3DCF5] text-[#55469C] shadow-sm',
    mint: 'bg-[#D7F0E3] hover:bg-[#C2E8D2] text-[#246A42] shadow-sm',
    peach: 'bg-[#F4A261] hover:bg-[#E78F49] text-white shadow-md shadow-[#F4A261]/20',
    outline: 'border border-[#EAE6DF] hover:bg-[#F3EDE2] text-[#4A4A5A] bg-[#FAF7F2]',
    ghost: 'hover:bg-[#F4EFE6] text-[#4A4A5A]',
  };

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5 rounded-3xl',
    icon: 'p-2.5 rounded-xl',
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
