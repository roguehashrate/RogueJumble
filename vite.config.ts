import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import packageJson from './package.json'
import { normalizeUrl } from './src/lib/url'

const getGitHash = () => {
  try {
    return JSON.stringify(execSync('git rev-parse --short HEAD').toString().trim())
  } catch (error) {
    console.warn('Failed to retrieve commit hash:', error)
    return '"unknown"'
  }
}

const getAppVersion = () => {
  try {
    return JSON.stringify(packageJson.version)
  } catch (error) {
    console.warn('Failed to retrieve app version:', error)
    return '"unknown"'
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: '/',
    define: {
      'import.meta.env.GIT_COMMIT': getGitHash(),
      'import.meta.env.APP_VERSION': getAppVersion(),
      'import.meta.env.VITE_COMMUNITY_RELAY_SETS': JSON.parse(
        JSON.stringify(env.VITE_COMMUNITY_RELAY_SETS ?? '[]')
      ),
      'import.meta.env.VITE_COMMUNITY_RELAYS': (env.VITE_COMMUNITY_RELAYS ?? '')
        .split(',')
        .map((url) => normalizeUrl(url))
        .filter(Boolean)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'nostr-tools': ['nostr-tools', 'nostr-tools/nip57', 'nostr-tools/abstract-pool', 'nostr-tools/utils'],
            tiptap: [
              '@tiptap/react',
              '@tiptap/extension-document',
              '@tiptap/extension-paragraph',
              '@tiptap/extension-text',
              '@tiptap/extension-history',
              '@tiptap/extension-hard-break',
              '@tiptap/extension-placeholder',
              '@tiptap/extension-emoji',
              '@tiptap/core'
            ],
            'react-lightbox': ['yet-another-react-lightbox'],
            'markdown-renderer': ['react-markdown', 'remark-gfm'],
            'emoji-picker': ['emoji-picker-react'],
            'bitcoin-connect': ['@getalby/bitcoin-connect-react', '@getalby/lightning-tools'],
            'drag-drop': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities']
          }
        }
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,jpg,svg}'],
          globDirectory: 'dist/',
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          cleanupOutdatedCaches: true
        },
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'RogueJumble',
          short_name: 'RogueJumble',
          icons: [
            {
              src: '/roguejumble-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/roguejumble-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/roguejumble-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/roguejumble-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/roguejumble-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'monochrome'
            }
          ],
          start_url: '/',
          display: 'standalone',
          background_color: '#FFFFFF',
          theme_color: '#FFFFFF',
          description: packageJson.description,
          shortcuts: [
            {
              name: 'New Post',
              short_name: 'New Post',
              description: 'Create a new post',
              url: '/?page=home',
              icons: [{ src: '/roguejumble-192x192.png', sizes: '192x192' }]
            },
            {
              name: 'Notifications',
              short_name: 'Notifications',
              description: 'View your notifications',
              url: '/?page=notifications',
              icons: [{ src: '/roguejumble-192x192.png', sizes: '192x192' }]
            },
            {
              name: 'Explore',
              short_name: 'Explore',
              description: 'Explore the Nostr network',
              url: '/?page=explore',
              icons: [{ src: '/roguejumble-192x192.png', sizes: '192x192' }]
            }
          ]
        }
      })
    ]
  }
})
