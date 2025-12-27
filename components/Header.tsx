
import React, { useState, useEffect, useRef } from 'react';
import { UserIcon, LogoutIcon, ChevronRightIcon } from './Icons';
import { User } from './userData';
import { useTheme } from './ThemeContext';
import { Sun, Moon, ArrowLeft } from 'lucide-react';

interface HeaderProps {
    activePage: string;
    user: User | null;
    onLogout: () => void;
    onNavigate?: (page: string) => void;
    onMobileMenuToggle?: () => void;
}

// Page hierarchy for breadcrumbs
const pageHierarchy: Record<string, { parent?: string; title: string; icon?: string }> = {
  'Dashboard': { title: 'Dashboard', icon: '📊' },
  'Members': { title: 'Members', icon: '👥' },
  'Add Member': { parent: 'Members', title: 'Add Member', icon: '➕' },
  'Member Details': { parent: 'Members', title: 'Member Details', icon: '👤' },
  'Manage Groups': { parent: 'Members', title: 'Manage Groups', icon: '👥' },
  'Birthdays': { parent: 'Members', title: 'Birthdays', icon: '🎂' },
  'Attendance': { title: 'Attendance', icon: '📋' },
  'Mark Attendance': { parent: 'Attendance', title: 'Mark Attendance', icon: '✅' },
  'Finance': { title: 'Finance', icon: '💰' },
  'Add Transaction': { parent: 'Finance', title: 'Add Transaction', icon: '➕' },
  'SMS Broadcast': { title: 'SMS', icon: '📱' },
  'Equipment': { title: 'Equipment', icon: '🔧' },
  'Add Equipment': { parent: 'Equipment', title: 'Add Equipment', icon: '➕' },
  'Add Maintenance': { parent: 'Equipment', title: 'Add Maintenance', icon: '🔧' },
  'Visitors': { title: 'Visitors', icon: '👋' },
  'Reports': { title: 'Reports', icon: '📈' },
  'Users': { title: 'Users', icon: '👤' },
  'Add User': { parent: 'Users', title: 'Add User', icon: '➕' },
  'Settings': { title: 'Settings', icon: '⚙️' },
  'AI Features': { title: 'AI Features', icon: '🤖' },
  'Branches': { title: 'Branches', icon: '🏢' },
  'Add Branch': { parent: 'Branches', title: 'Add Branch', icon: '➕' },
  'Data Personnel Management': { title: 'Data Personnel', icon: '👥' },
  'Recycle Bin': { title: 'Recycle Bin', icon: '🗑️' },
  'Permission Requests': { title: 'Permission Requests', icon: '🔐' },
  'User Session Monitor': { title: 'Session Monitor', icon: '👁️' },
};

const Header: React.FC<HeaderProps> = ({ activePage, user, onLogout, onNavigate, onMobileMenuToggle }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { theme, setTheme, mode, setMode, colors } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const themes = ['green', 'blue', 'purple', 'orange', 'dark'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Generate breadcrumb path
  const getBreadcrumbs = () => {
    const breadcrumbs = [];
    let currentPage = activePage;
    
    while (currentPage) {
      const pageInfo = pageHierarchy[currentPage];
      if (pageInfo) {
        breadcrumbs.unshift({ page: currentPage, ...pageInfo });
        currentPage = pageInfo.parent;
      } else {
        break;
      }
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const currentPageInfo = pageHierarchy[activePage] || { title: activePage, icon: '📄' };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 ${colors.sidebar} border-b-2 border-white/20 h-20 no-print shadow-lg`}>
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 h-full">
        {/* Mobile Menu Button */}
        <div className="lg:hidden">
          <button
            onClick={onMobileMenuToggle}
            className="p-2 rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Logo and Brand on the Left */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <img src="https://i.ibb.co/5xzH9bWR/HKM-LOGO.png" alt="HKM MINISTRIES Logo" className="h-8 sm:h-10 lg:h-12 w-auto" />
          <div className="flex flex-col">
            <span className="text-sm sm:text-base lg:text-lg font-bold text-white leading-tight">HKM Church</span>
            <span className="text-xs text-white/80 hidden sm:block">Management</span>
          </div>
          
          {/* Vertical Divider - Hidden on mobile and tablet */}
          <div className="hidden lg:block h-12 w-px bg-white/20 mx-4"></div>
          
          {/* Current Page and Breadcrumbs - Hidden on mobile, simplified on tablet */}
          <div className="hidden sm:flex items-center space-x-2">
            {/* Back Button for sub-pages */}
            {currentPageInfo.parent && onNavigate && (
              <button
                onClick={() => onNavigate(currentPageInfo.parent!)}
                className="flex items-center space-x-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white text-sm"
                title={`Back to ${pageHierarchy[currentPageInfo.parent]?.title}`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden lg:inline">Back</span>
              </button>
            )}
            
            {/* Breadcrumb Navigation - Simplified on tablet */}
            <nav className="flex items-center space-x-1 lg:space-x-2">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.page}>
                  {index > 0 && <ChevronRightIcon className="w-3 h-3 lg:w-4 lg:h-4 text-white/60" />}
                  <button
                    onClick={() => onNavigate && onNavigate(crumb.page)}
                    className={`flex items-center space-x-1 lg:space-x-2 px-1 lg:px-2 py-1 rounded-md transition-colors text-xs lg:text-sm ${
                      index === breadcrumbs.length - 1
                        ? 'bg-white/20 text-white font-semibold'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                    disabled={index === breadcrumbs.length - 1}
                  >
                    <span>{crumb.icon}</span>
                    <span className="hidden lg:inline">{crumb.title}</span>
                  </button>
                </React.Fragment>
              ))}
            </nav>
          </div>
          
          {/* Mobile Page Title - Only visible on mobile */}
          <div className="sm:hidden flex items-center space-x-2 ml-2">
            <span className="text-lg">{currentPageInfo.icon}</span>
            <span className="text-sm font-semibold text-white truncate max-w-32">{currentPageInfo.title}</span>
          </div>
        </div>

        {/* Right Side Controls - Responsive */}
        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
          {/* Theme Selector - Hidden on mobile and tablet */}
          <div className="hidden xl:flex items-center space-x-2">
            <span className="text-sm font-medium text-white">Theme:</span>
            <select 
              value={theme} 
              onChange={(e) => setTheme(e.target.value as any)}
              className="px-3 py-1 text-sm border border-white/30 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
              style={{
                colorScheme: 'dark'
              }}
            >
              {themes.map(t => (
                <option key={t} value={t} style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          {/* Day/Night Mode Toggle */}
          <div className="flex items-center space-x-2 pl-2 lg:ml-4 lg:pl-4 border-l border-white/20">
            <button
              onClick={() => setMode(mode === 'day' ? 'night' : 'day')}
              className="flex items-center space-x-1 lg:space-x-2 px-2 lg:px-3 py-1 text-sm border border-white/30 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white"
              title={mode === 'day' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
            >
              {mode === 'day' ? (
                <>
                  <Moon className="w-4 h-4" />
                  <span className="hidden lg:inline">Night</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4" />
                  <span className="hidden lg:inline">Day</span>
                </>
              )}
            </button>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3 p-1 sm:p-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 transition-colors"
            >
              <span className="text-white font-semibold hidden md:block text-sm lg:text-base truncate max-w-24 lg:max-w-none">{user ? user.username : 'No User'}</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/30 flex-shrink-0">
                 {user?.avatar ? (
                     <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                 ) : (
                     <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                 )}
              </div>
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                <div className="px-4 py-2 border-b">
                  <p className="text-sm font-semibold text-gray-800">{user?.username}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
                {/* Mobile/Tablet Theme Selector */}
                <div className="xl:hidden px-4 py-2 border-b">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Theme:</label>
                  <select 
                    value={theme} 
                    onChange={(e) => setTheme(e.target.value as any)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-white text-gray-700"
                  >
                    {themes.map(t => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600"
                >
                  <LogoutIcon className="w-5 h-5 mr-2" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
