import { defineStore } from 'pinia'

export const useTodoStore = defineStore('todo', {
    // state 就像是你的数据库表格
    state: () => ({
        list: []
    }),
    actions: {
        addTodo(text) {
            this.list.push({ id: Date.now(), content: text })
        }
    },
    // ✨ 魔法在这里：开启持久化
    persist: true
})