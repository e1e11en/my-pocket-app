import { defineStore } from 'pinia'
import { del } from 'idb-keyval' // 引入删除功能

export const useMusicStore = defineStore('music', {
    state: () => ({
        playlist: [],
        currentIndex: 0,
    }),
    getters: {
        currentTrack: (state) => {
            return state.playlist[state.currentIndex] || { title: '等待开启', artist: '时光抽屉', cover: '' }
        }
    },
    actions: {
        addTrack(track) {
            this.playlist.push(track)
        },
        async removeTrack(index) {
            const track = this.playlist[index]
            if (!track) return

            // 1. 从数据库物理删除
            await del(`file_${track.id}`)

            // 2. 从列表删除
            this.playlist.splice(index, 1)

            // 3. 修正索引：如果删的是当前播放，或者删掉后索引越界
            if (this.currentIndex >= this.playlist.length) {
                this.currentIndex = Math.max(0, this.playlist.length - 1)
            }
        },
        nextTrack() {
            if (this.playlist.length > 1) {
                this.currentIndex = (this.currentIndex + 1) % this.playlist.length
            }
        },
        prevTrack() {
            if (this.playlist.length > 1) {
                this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length
            }
        }
    },
    persist: true
})