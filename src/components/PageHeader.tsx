import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}

export default function PageHeader({ title, subtitle, icon }: PageHeaderProps) {
  return (
    <div className="mb-8 animate-slide-up">
      <div className="flex items-center gap-3 mb-2">
        {icon && (
          <div className="w-12 h-12 rounded-xl bg-saathi-50 flex items-center justify-center text-saathi-600">
            {icon}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-saathi-900">
          {title}
        </h1>
      </div>
      {subtitle && (
        <p className="text-saathi-600 text-base sm:text-lg max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}
