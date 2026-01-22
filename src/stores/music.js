import { defineStore } from 'pinia'
import { del } from 'idb-keyval'

export const useMusicStore = defineStore('music', {
    state: () => ({
        // 增加默认音乐数据
        playlist: [
            {
                id: 'default_1',
                title: 'Music1',
                artist: 'artist1',
                cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500',
                url: '/music/music1.mp3', // 确保文件放在 public/music/music1.mp3
                isDefault: true
            },
            {
                id: 'default_2',
                title: 'Music2',
                artist: 'artist2',
                cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
                url: '/music/music2.mp3', // 确保文件放在 public/music/music2.mp3
                isDefault: true
            }
        ],
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

            // 1. 只有不是默认音乐时，才从数据库物理删除
            if (!track.isDefault) {
                await del(`file_${track.id}`)
            }

            // 2. 从列表删除
            this.playlist.splice(index, 1)

            // 3. 修正索引
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