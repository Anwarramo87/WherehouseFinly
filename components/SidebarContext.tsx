"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleCollapse: () => void;
  toggleMobileOpen: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  const getInitialCollapsed = () => {
    if (typeof window === 'undefined' || !isHydrated) return false;
    return window.matchMedia('(max-width: 768px)').matches;
  };

  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed());
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Set hydrated after mount to avoid hydration mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Listen for media query changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsCollapsed(e.matches);
      if (e.matches) setIsMobileOpen(false);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleCollapse = () => setIsCollapsed(prev => !prev);
  const toggleMobileOpen = () => setIsMobileOpen(prev => !prev);
  const closeMobile = () => setIsMobileOpen(false);

  return (
    <SidebarContext.Provider value={{
      isCollapsed,
      isMobileOpen,
      toggleCollapse,
      toggleMobileOpen,
      closeMobile
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}

