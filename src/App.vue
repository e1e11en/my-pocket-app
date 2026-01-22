<template>
  <div id="app" :class="currentView">
    <header class="app-header">
      <nav class="nav-tabs">
        <button @click="currentView = 'todo'" :class="{ active: currentView === 'todo' }">⏳ 抽屉</button>
        <button @click="currentView = 'music'" :class="{ active: currentView === 'music' }">🎵 播放器</button>
      </nav>
    </header>

    <main class="app-body">
      <Transition name="fade">
        <div v-if="currentView === 'todo'" class="todo-section">
          <div class="glass-card">
            <h2>我的时光抽屉</h2>
            <input v-model="newItem" @keyup.enter="save" placeholder="写点什么，存入时光...">
            <ul>
              <li v-for="item in todo.list" :key="item.id">{{ item.content }}</li>
            </ul>
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <div v-if="currentView === 'music'" class="music-view">
          <MusicPlayer />
        </div>
      </Transition>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useTodoStore } from './stores/todo'
import MusicPlayer from './components/MusicPlayer.vue' // 确保路径正确

const todo = useTodoStore()
const newItem = ref('')
const currentView = ref('todo')

const save = () => {
  if (!newItem.value.trim()) return
  todo.addTodo(newItem.value)
  newItem.value = ''
}
</script>

<style>
/* 1. 基础重置：消除溢出和默认边距 */
body,
html {
  margin: 0;
  padding: 0;
  height: 100%;
  background: #121212;
  /* 全局深色底色 */
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, system-ui, sans-serif;
  transition: background 0.5s ease;
}

/* 2. 导航栏美化：悬浮在最上方 */
.app-header {
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1000;
  padding: 15px 0;
  display: flex;
  justify-content: center;
}

.nav-tabs {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 4px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-tabs button {
  padding: 6px 18px;
  border: none;
  background: transparent;
  color: #888;
  border-radius: 16px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.nav-tabs button.active {
  background: #fff;
  color: #000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* 3. 内容区适配 */
.app-body {
  flex: 1;
  position: relative;
}

/* 待办事项页面样式：加上毛玻璃感适配深色背景 */
.todo-section {
  padding: 80px 20px 20px;
  max-width: 600px;
  margin: 0 auto;
}

.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 30px;
  border-radius: 24px;
  color: white;
}

/* 播放器页面样式：彻底铺满 */
.music-view {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* 输入框适配 */
input {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  margin-bottom: 20px;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 针对不同页面的 body 背景色微调 */
#app.todo {
  background: #1a1a1a;
}

#app.music {
  background: #000;
}
</style>