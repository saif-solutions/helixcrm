import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // Get backend URL from env or default to localhost:3001
  const BACKEND_URL = env.VITE_BACKEND_URL || 'http://localhost:3001'
  const FRONTEND_PORT = 3000
  
  console.log(`🚀 Vite Configuration:
    - Mode: ${mode}
    - Frontend: http://localhost:${FRONTEND_PORT}
    - Backend: ${BACKEND_URL}
    - API Path: /api/v1
  `)
  
  return {
    server: {
      port: FRONTEND_PORT,
      host: true,
      open: mode !== 'production',
      cors: true,
      
      // Simple proxy configuration
      proxy: {
        '/api': {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
        },
      },
    },
    
    preview: {
      port: FRONTEND_PORT,
      host: true,
    },
    
    build: {
      outDir: 'dist',
      sourcemap: mode === 'production' ? 'hidden' : true,
      minify: mode === 'production' ? 'esbuild' : false,
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': [
              '@heroicons/react',
              'lucide-react',
              '@radix-ui/react-dropdown-menu'
            ],
            'state-vendor': ['@tanstack/react-query', 'zustand', 'react-hook-form'],
            'utils-vendor': ['axios', 'zod', 'uuid']
          }
        }
      },
    },
    
    plugins: [
      react({
        include: '**/*.{jsx,tsx,ts,js}',
        jsxImportSource: 'react',
      }),
    ],
    
    resolve: {
      alias: {
        // Base alias
        '@': path.resolve(__dirname, './src'),
        
        // Atomic Design aliases
        '@atoms': path.resolve(__dirname, './src/components/atoms'),
        '@molecules': path.resolve(__dirname, './src/components/molecules'),
        '@organisms': path.resolve(__dirname, './src/components/organisms'),
        '@feedback': path.resolve(__dirname, './src/components/feedback'),
        '@layout': path.resolve(__dirname, './src/components/layout'),
        
        // Feature aliases
        '@pages': path.resolve(__dirname, './src/pages'),
        '@services': path.resolve(__dirname, './src/services'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@stores': path.resolve(__dirname, './src/stores'),
        '@providers': path.resolve(__dirname, './src/providers'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@contexts': path.resolve(__dirname, './src/contexts'),
        '@auth': path.resolve(__dirname, './src/components/auth'),
        '@contacts': path.resolve(__dirname, './src/components/contacts'),
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.css'],
    },
    
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '0.9.0'),
      __APP_NAME__: JSON.stringify(env.VITE_APP_NAME || 'HelixCRM'),
      __ENVIRONMENT__: JSON.stringify(mode),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    },
    
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@heroicons/react',
        'lucide-react',
        '@tanstack/react-query',
        'zustand'
      ],
      exclude: ['@tanstack/react-query-devtools'],
    },
    
    // Performance optimizations
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
  }
})