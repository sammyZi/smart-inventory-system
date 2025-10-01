import React from 'react';
import { cn } from '@/lib/utils';

interface GlassProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'nav' | 'modal' | 'sidebar' | 'dashboard' | 'button';
  blur?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  color?: 'default' | 'blue' | 'green' | 'red' | 'purple';
  dark?: boolean;
  children: React.ReactNode;
}

const Glass = React.forwardRef<HTMLDivElement, GlassProps>(
  ({ className, variant = 'default', blur, color, dark = false, children, ...props }, ref) => {
    const baseClass = dark ? 'glass-dark' : 'glass';
    
    const variantClasses = {
      default: '',
      card: 'glass-card',
      nav: 'glass-nav',
      modal: 'glass-modal',
      sidebar: 'glass-sidebar',
      dashboard: 'glass-dashboard-card',
      button: 'glass-button'
    };

    const blurClasses = blur ? `glass-blur-${blur}` : '';
    
    const colorClasses = {
      default: '',
      blue: 'glass-blue',
      green: 'glass-green',
      red: 'glass-red',
      purple: 'glass-purple'
    };

    return (
      <div
        className={cn(
          baseClass,
          variantClasses[variant],
          blurClasses,
          color && colorClasses[color],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Glass.displayName = 'Glass';

// Specific component variants for common use cases
export const GlassCard = React.forwardRef<HTMLDivElement, Omit<GlassProps, 'variant'>>(
  (props, ref) => <Glass variant="card" ref={ref} {...props} />
);

export const GlassModal = React.forwardRef<HTMLDivElement, Omit<GlassProps, 'variant'>>(
  (props, ref) => <Glass variant="modal" ref={ref} {...props} />
);

export const GlassNav = React.forwardRef<HTMLDivElement, Omit<GlassProps, 'variant'>>(
  (props, ref) => <Glass variant="nav" ref={ref} {...props} />
);

export const GlassSidebar = React.forwardRef<HTMLDivElement, Omit<GlassProps, 'variant'>>(
  (props, ref) => <Glass variant="sidebar" ref={ref} {...props} />
);

export const GlassDashboardCard = React.forwardRef<HTMLDivElement, Omit<GlassProps, 'variant'>>(
  (props, ref) => <Glass variant="dashboard" ref={ref} {...props} />
);

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  blur?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  color?: 'default' | 'blue' | 'green' | 'red' | 'purple';
  dark?: boolean;
  children: React.ReactNode;
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, blur, color, dark = false, children, ...props }, ref) => {
    const baseClass = 'glass-button';
    const blurClasses = blur ? `glass-blur-${blur}` : '';
    
    const colorClasses = {
      default: '',
      blue: 'glass-blue',
      green: 'glass-green',
      red: 'glass-red',
      purple: 'glass-purple'
    };

    return (
      <button
        className={cn(
          baseClass,
          blurClasses,
          color && colorClasses[color],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  blur?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  color?: 'default' | 'blue' | 'green' | 'red' | 'purple';
  dark?: boolean;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, blur, color, dark = false, ...props }, ref) => {
    const baseClass = 'glass-input';
    const blurClasses = blur ? `glass-blur-${blur}` : '';
    
    const colorClasses = {
      default: '',
      blue: 'glass-blue',
      green: 'glass-green',
      red: 'glass-red',
      purple: 'glass-purple'
    };

    return (
      <input
        className={cn(
          baseClass,
          blurClasses,
          color && colorClasses[color],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

GlassCard.displayName = 'GlassCard';
GlassModal.displayName = 'GlassModal';
GlassNav.displayName = 'GlassNav';
GlassSidebar.displayName = 'GlassSidebar';
GlassDashboardCard.displayName = 'GlassDashboardCard';
GlassButton.displayName = 'GlassButton';
GlassInput.displayName = 'GlassInput';

export { Glass };