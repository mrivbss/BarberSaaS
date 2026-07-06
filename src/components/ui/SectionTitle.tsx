import { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface SectionTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h2' | 'h3';
}

export function SectionTitle({ className, as: Tag = 'h2', children, ...props }: SectionTitleProps) {
  return (
    <Tag
      className={cn('text-lg font-semibold tracking-tight text-foreground', className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
