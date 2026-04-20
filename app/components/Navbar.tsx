'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { FiUser, FiSettings, FiLogOut } from 'react-icons/fi';
import { FaDiscord, FaCrown } from 'react-icons/fa';

interface NavbarProps {
  onLoginClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLoginClick }) => {
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 150);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="w-full flex justify-between items-center px-8 py-6 max-w-7xl mx-auto z-50 relative">
      <div className="font-bold text-2xl tracking-tight text-text">
        Fresh<span className="text-blue-600">Resume</span>
      </div>
      
      {!session ? (
        <button
          onClick={onLoginClick}
          className="cursor-pointer px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors font-medium text-sm text-text"
        >
          Login
        </button>
      ) : (
        <div 
          className="relative" 
          ref={dropdownRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="cursor-pointer w-10 h-10 rounded-full border border-gray-200 overflow-hidden outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all flex items-center justify-center bg-blue-50 hover:bg-blue-100 shadow-sm"
          >
            <span className="text-blue-600 font-bold text-lg uppercase">
              {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
            </span>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-[0_10px_50px_-12px_rgba(0,0,0,0.25)] border border-gray-200 text-gray-800 overflow-hidden py-1 z-50 origin-top-right">
              
              {/* User Header */}
              <div className="flex items-center px-4 py-3 gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base shrink-0">
                  {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-wide text-gray-900">{session.user?.name || 'User'}</span>
                  <span className="text-xs text-gray-500 font-medium mt-0.5">Free Plan</span>
                </div>
              </div>

              {/* Credits Section */}
              <div className="px-4 py-1.5">
                <div className="flex justify-between items-center mb-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                  <span className="text-xs font-semibold text-gray-700">Credits used</span>
                  <span className="text-xs text-gray-400">›</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[80%] h-full bg-blue-500"></div>
                </div>
              </div>

              {/* Go Premium */}
              <div className="px-3 py-2">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-2.5 flex justify-between items-center cursor-pointer shadow-sm hover:opacity-95 transition-opacity">
                  <div className="flex items-center gap-2 text-white">
                    <FaCrown className="text-blue-100 text-sm" />
                    <span className="text-xs font-bold tracking-wide">Go Premium</span>
                  </div>
                  <span className="text-[10px] bg-white text-blue-700 font-bold px-2 py-1 rounded-md uppercase tracking-wider">Upgrade</span>
                </div>
              </div>

              {/* Menu Items */}
              <div className="px-2 py-1.5 flex flex-col gap-0.5">
                <button onClick={() => setIsDropdownOpen(false)} className="cursor-pointer flex items-center gap-3 px-3 py-2 text-sm font-semibold hover:bg-gray-50 rounded-lg transition-colors text-left w-full tracking-wide text-gray-700">
                  <FiUser className="text-[1.1rem] text-gray-400" />
                  View profile
                </button>
                <button onClick={() => setIsDropdownOpen(false)} className="cursor-pointer flex items-center gap-3 px-3 py-2 text-sm font-semibold hover:bg-gray-50 rounded-lg transition-colors text-left w-full tracking-wide text-gray-700">
                  <FiSettings className="text-[1.1rem] text-gray-400" />
                  Manage account
                </button>
                <button onClick={() => setIsDropdownOpen(false)} className="cursor-pointer flex items-center gap-3 px-3 py-2 text-sm font-semibold hover:bg-gray-50 rounded-lg transition-colors text-left w-full tracking-wide text-gray-700">
                  <FaDiscord className="text-[1.1rem] text-gray-400" />
                  Join our community
                </button>
              </div>

              <div className="mx-4 my-1 border-t border-gray-100"></div>

              {/* Sign Out */}
              <div className="px-2 pb-2">
                <button 
                  onClick={async () => {
                    setIsDropdownOpen(false);
                    await signOut({ redirect: false });
                    window.location.reload();
                  }}
                  className="cursor-pointer flex items-center gap-3 px-3 py-2 text-sm font-semibold hover:bg-red-50 group hover:text-red-600 rounded-lg transition-colors text-left w-full tracking-wide text-gray-700"
                >
                  <FiLogOut className="text-[1.1rem] text-gray-400 group-hover:text-red-500" />
                  Sign out
                </button>
              </div>

            </div>
          )}
        </div>
      )}
    </nav>
  );
};
