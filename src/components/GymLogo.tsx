import React from 'react';
import { realmDB } from '../lib/realm';

interface GymLogoProps {
  className?: string;
  size?: number;
}

export default function GymLogo({ className = '', size = 120 }: GymLogoProps) {
  const settings = realmDB.getSettings();
  const appName = settings.appName || "DEMO GYM";
  const logoUrl = settings.logoUrl;

  // Use a cache-busting query parameter for icon.svg to ensure it updates immediately
  const defaultIconUrl = "/icon.svg?v=" + Date.now();

  if (logoUrl && logoUrl.trim() !== '') {
    return (
      <div 
        className={`relative flex items-center justify-center select-none transition-all ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <img 
           src={logoUrl} 
           alt={appName} 
           referrerPolicy="no-referrer"
           className="w-full h-full object-contain" 
         />
      </div>
    );
  }

  // Fallback to the default icon.svg
  return (
    <div 
      className={`relative flex items-center justify-center select-none transition-all ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <img 
         src={defaultIconUrl} 
         alt={appName} 
         className="w-full h-full object-contain" 
       />
    </div>
  );
}
