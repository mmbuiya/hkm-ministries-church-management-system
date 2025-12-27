import React from 'react';
import { useTheme } from './ThemeContext';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{
    label: string;
    onClick?: () => void;
  }>;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  subtitle, 
  icon, 
  actions, 
  breadcrumbs 
}) => {
  const { modeColors } = useTheme();

  return (
    <div className={`sticky top-0 z-40 ${modeColors.card} border-b ${modeColors.border} shadow-sm`}>
      <div className="px-6 py-4">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-2 mb-2">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <span className={`text-sm ${modeColors.textSecondary}`}>›</span>
                )}
                <button
                  onClick={crumb.onClick}
                  className={`text-sm ${
                    index === breadcrumbs.length - 1
                      ? `${modeColors.text} font-medium`
                      : `${modeColors.textSecondary} hover:${modeColors.text}`
                  } transition-colors`}
                  disabled={index === breadcrumbs.length - 1}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Main Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="flex-shrink-0">
                {icon}
              </div>
            )}
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold ${modeColors.text}`}>
                {title}
              </h1>
              {subtitle && (
                <p className={`mt-1 text-sm sm:text-base ${modeColors.textSecondary}`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          {/* Actions */}
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;