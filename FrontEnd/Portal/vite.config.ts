import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // Docker Desktop on Windows/macOS doesn't forward native filesystem
    // change events into the container across a bind mount, so chokidar's
    // default watcher never sees host-side edits and Vite keeps serving a
    // stale cached transform. Polling works everywhere (host or container).
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
})
