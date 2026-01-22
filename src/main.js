import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate' // 引入插件
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

pinia.use(piniaPluginPersistedstate) // 告诉 Pinia 使用这个插件

app.use(pinia)
app.mount('#app')