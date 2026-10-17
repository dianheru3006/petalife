import type { FC, HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'peach' | 'lavender' | 'mint' | 'pink' | 'cream' | 'default';
  size?: 'sm' | 'md';
}

export const Badge: FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-[#F4EFE6] text-[#4A4A5A] border-[#E5DEC9]',
    peach: 'bg-[#FFEFE8] text-[#D97736] border-[#FED7C5]',
    lavender: 'bg-[#F0EDF9] text-[#7161BF] border-[#DCD6F3]',
    mint: 'bg-[#EAF6EE] text-[#36955E] border-[#CCEBD6]',
    pink: 'bg-[#FDF0F4] text-[#C44A72] border-[#FAD0DC]',
    cream: 'bg-[#FFFDF9] text-[#5A554A] border-[#EFE8D8]',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded-full font-medium border',
    md: 'text-xs px-2.5 py-1 rounded-full font-semibold border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 transition-colors',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
