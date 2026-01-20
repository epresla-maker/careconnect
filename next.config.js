// next.config.js

// 1. Behívjuk a PWA csomagot
const withPWA = require('next-pwa')({
  dest: 'public', // Ide generálja a PWA fájlokat
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development' // Fejlesztés közben ne fusson
});

// 2. Az alap Next.js beállítások
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack config (üres, mert a next-pwa webpack-et használ)
  turbopack: {},
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Development optimizations
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.next', '**/.git'],
      };
    }
    
    // Memory optimization
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
    };
    
    return config;
  },
  
  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'firebase', 'date-fns'],
  },
};

// 3. Fejlesztés alatt ne használjuk a PWA wrapper-t (eltávolítjuk a webpack módosítást),
//    de éles környezetben bekapcsoljuk a PWA-t.
module.exports =
  process.env.NODE_ENV === 'development' ? nextConfig : withPWA(nextConfig);
