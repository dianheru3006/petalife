import type { FC } from 'react';
import { cn } from '../../lib/utils';

export interface ProgressBarProps {
  value: number; // 0 - 100
  max?: number;
  label?: string;
  valueDisplay?: string;
  icon?: string;
  color?: 'peach' | 'lavender' | 'mint' | 'pink' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  valueDisplay,
  icon,
  color = 'peach',
  size = 'md',
  className
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colorStyles = {
    peach: 'bg-gradient-to-r from-[#FED7C5] to-[#F4A261]',
    lavender: 'bg-gradient-to-r from-[#DCD6F3] to-[#9381DA]',
    mint: 'bg-gradient-to-r from-[#CCEBD6] to-[#57B37C]',
    pink: 'bg-gradient-to-r from-[#FAD0DC] to-[#E57399]',
    orange: 'bg-gradient-to-r from-[#FED7C5] to-[#E78F49]',
  };

  const heightStyles = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || valueDisplay) && (
        <div className="flex justify-between items-center text-xs font-semibold mb-1 text-[#4A4A5A]">
          <span className="flex items-center gap-1.5">
            {icon && <span>{icon}</span>}
            <span>{label}</span>
          </span>
          <span className="text-[#4A4A5A] font-semibold">{valueDisplay || `${Math.round(percentage)}%`}</span>
        </div>
      )}
      <div className={cn('w-full bg-[#EFECE6] rounded-full overflow-hidden p-0.5', heightStyles[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', colorStyles[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
