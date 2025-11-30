import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/ndr/', // GitHub Pages base path
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-charts': ['recharts'],
          
          // Component chunks
          'components-core': [
            './src/components/Toast.jsx',
            './src/components/LoadingSpinner.jsx',
            './src/components/ErrorBoundary.jsx'
          ],
          'components-dashboard': [
            './src/components/AlertModal.jsx',
            './src/components/EventSearch.jsx',
            './src/components/RealTimeFeed.jsx'
          ],
          'components-features': [
            './src/components/NetworkAnalytics.jsx',
            './src/components/SensorManagement.jsx',
            './src/components/AssetDiscovery.jsx',
            './src/components/ThreatIntelligence.jsx'
          ],
          'components-advanced': [
            './src/components/AdvancedDetection.jsx',
            './src/components/SSLAnalysis.jsx',
            './src/components/FileAnalysis.jsx',
            './src/components/DNSIntelligence.jsx',
            './src/components/SoarIntegration.jsx',
            './src/components/SocDashboard.jsx'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
})
