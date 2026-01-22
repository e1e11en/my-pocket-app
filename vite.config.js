import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '我的唱片机',
        short_name: '唱片机',
        description: '基于Vue3的本地音乐播放器',
        theme_color: '#0a0a0a',
        icons: [
          {
            src: 'pwa-192x192.png', // 需在 public 目录下放这张图
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', // 需在 public 目录下放这张图
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})