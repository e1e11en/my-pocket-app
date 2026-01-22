<template>
    <div class="player-container">
        <div class="background-blur"
            :style="{ backgroundImage: `url(${musicStore.currentTrack.cover || defaultCover})` }"></div>
        <div class="background-overlay"></div>

        <main class="player-content">
            <section class="vinyl-display">
                <div class="vinyl-layout">
                    <div class="stylus" :class="{ 'is-playing': isPlaying }">
                        <div class="stylus-pivot"></div>
                        <div class="stylus-arm"></div>
                        <div class="stylus-head"></div>
                    </div>
                    <div class="disc" :class="{ 'rotate': isPlaying }">
                        <div class="disc-vinyl">
                            <div class="disc-label">
                                <img :src="musicStore.currentTrack.cover || defaultCover" alt="cover" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="info-group">
                <h1 class="song-name">{{ musicStore.currentTrack.title }}</h1>
                <p class="artist">{{ musicStore.currentTrack.artist }}</p>
            </section>

            <section class="progress-bar-group">
                <span class="time-label">{{ formatTime(currentTime) }}</span>
                <div class="slider-track">
                    <input type="range" :max="duration" step="0.1" v-model="currentTime" @input="seek"
                        class="range-input" />
                    <div class="fill-bar" :style="{ width: (currentTime / duration * 100) + '%' }"></div>
                </div>
                <span class="time-label">{{ formatTime(duration) }}</span>
            </section>

            <section class="controls-group">
                <div class="main-controls">


                    <button class="btn-main" @click="musicStore.prevTrack()">
                        <i class="icon-pre"></i>
                    </button>

                    <button class="btn-play-state" @click="togglePlay">
                        <div :class="isPlaying ? 'icon-pause' : 'icon-play'"></div>
                    </button>

                    <button class="btn-main" @click="musicStore.nextTrack()">
                        <i class="icon-next"></i>
                    </button>
                    <button class="btn-secondary" @click="showList = true">
                        <i class="icon-list"></i>
                    </button>
                </div>
            </section>
        </main>

        <Transition name="slide">
            <div v-if="showList" class="playlist-overlay" @click.self="showList = false">
                <div class="playlist-card">
                    <div class="header">
                        <h3>播放队列 ({{ musicStore.playlist.length }})</h3>
                        <button class="close-btn" @click="showList = false">完成</button>
                    </div>
                    <div class="list-items">
                        <div v-for="(item, index) in musicStore.playlist" :key="item.id" class="item"
                            :class="{ 'active': musicStore.currentIndex === index }">
                            <div class="item-info" @click="selectTrack(index)">
                                <span class="item-title">{{ item.title }}</span>
                                <span class="item-artist-sub">{{ item.artist }}</span>
                            </div>
                            <div class="item-right">
                                <div v-if="musicStore.currentIndex === index" class="playing-bars">
                                    <span></span><span></span><span></span>
                                </div>
                                <button class="item-del-btn" @click.stop="confirmDelete(index)">✕</button>
                            </div>
                        </div>
                        <label class="add-track-btn">
                            + 添加本地音频文件
                            <input type="file" @change="handleUpload" accept="audio/*" hidden />
                        </label>
                    </div>
                </div>
            </div>
        </Transition>

        <audio ref="audioRef" @timeupdate="onTimeUpdate" @loadedmetadata="onMeta" @ended="onEnded"></audio>
    </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useMusicStore } from '../stores/music'
import { get, set } from 'idb-keyval'

const musicStore = useMusicStore()
const audioRef = ref(null)
const isPlaying = ref(false)
const showList = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const defaultCover = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500'

const loadTrackResource = async (index, shouldPlay = false) => {
    const track = musicStore.playlist[index]
    if (!track) return
    const file = await get(`file_${track.id}`)
    if (file) {
        if (audioRef.value.src) URL.revokeObjectURL(audioRef.value.src)
        audioRef.value.src = URL.createObjectURL(file)
        audioRef.value.load()
        if (shouldPlay) {
            audioRef.value.play().catch(() => { })
            isPlaying.value = true
        } else {
            isPlaying.value = false
        }
    }
}

const togglePlay = () => {
    if (!audioRef.value.src) return alert('请先添加音乐')
    isPlaying.value ? audioRef.value.pause() : audioRef.value.play()
    isPlaying.value = !isPlaying.value
}

const selectTrack = (index) => {
    musicStore.currentIndex = index
    loadTrackResource(index, true)
}

const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const id = Date.now()
    await set(`file_${id}`, file)
    musicStore.addTrack({ id, title: file.name.replace(/\.[^/.]+$/, ""), artist: '本地上传', cover: defaultCover })
}

const confirmDelete = (index) => {
    if (musicStore.playlist.length === 0) return
    if (confirm('确定要删除这首歌吗？')) {
        musicStore.removeTrack(index)
        if (musicStore.playlist.length === 0) {
            audioRef.value.src = ''
            isPlaying.value = false
        }
    }
}

watch(() => musicStore.currentIndex, (newIdx) => {
    loadTrackResource(newIdx, isPlaying.value)
})

onMounted(() => {
    if (musicStore.playlist.length > 0) loadTrackResource(musicStore.currentIndex, false)
})

const onTimeUpdate = () => { currentTime.value = audioRef.value.currentTime }
const onMeta = () => { duration.value = audioRef.value.duration }
const seek = () => { audioRef.value.currentTime = currentTime.value }
const formatTime = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
const onEnded = () => musicStore.nextTrack()
</script>

<style scoped>
/* 1. 字体图标定义 */
@font-face {
    font-family: 'icomoon';
    src: url('./fonts/icomoon.eot?k6rtfz');
    src: url('./fonts/icomoon.eot?k6rtfz#iefix') format('embedded-opentype'),
        url('./fonts/icomoon.ttf?k6rtfz') format('truetype'),
        url('./fonts/icomoon.woff?k6rtfz') format('woff'),
        url('./fonts/icomoon.svg?k6rtfz#icomoon') format('svg');
    font-weight: normal;
    font-style: normal;
    font-display: block;
}

/* 统一图标样式 */
.icon-pre,
.icon-next,
.icon-list {
    font-family: 'icomoon' !important;
    font-style: normal;
    font-weight: normal;
    font-variant: normal;
    text-transform: none;
    line-height: 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-size: 24px;
    color: #fff;
}

.icon-pre::before {
    content: "\e905";
}

.icon-next::before {
    content: "\e908";
}

/* 请确认下一首在你的 icomoon 中是否是 e987 */
.icon-list::before {
    content: "\e904";
}

/* 请确认列表在你的 icomoon 中是否是 e9ba */

/* 2. 基础布局 */
.player-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background-color: #0a0a0a;
    color: #fff;
}

.player-content {
    position: relative;
    z-index: 2;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
}

.background-blur {
    position: absolute;
    inset: -20px;
    background-size: cover;
    background-position: center;
    filter: blur(50px) brightness(0.3);
    z-index: 0;
}

.background-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.85) 100%);
    z-index: 1;
}

/* 3. 唱片机 */
.vinyl-display {
    display: flex;
    justify-content: center;
    height: 45%;
    margin-top: 10%;
}

.vinyl-layout {
    position: relative;
    width: 300px;
    height: 300px;
}

.disc {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #111;
    border: 10px solid #1a1a1a;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
}

.disc-vinyl {
    width: 98%;
    height: 98%;
    border-radius: 50%;
    background: repeating-radial-gradient(circle, #111 0, #111 1px, #050505 2px);
    display: flex;
    align-items: center;
    justify-content: center;
}

.disc-label {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 3px solid #000;
    overflow: hidden;
    z-index: 2;
}

.disc-label img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.rotate {
    animation: rotateDisc 20s linear infinite;
}

@keyframes rotateDisc {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

.stylus {
    position: absolute;
    top: -30px;
    right: 20px;
    width: 40px;
    height: 120px;
    z-index: 10;
    transform-origin: 20px 20px;
    transform: rotate(-40deg);
    transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.stylus.is-playing {
    transform: rotate(5deg);
}

.stylus-pivot {
    width: 40px;
    height: 40px;
    background: #333;
    border-radius: 50%;
    box-shadow: 0 4px 10px #000;
}

.stylus-arm {
    width: 8px;
    height: 100px;
    background: #555;
    margin: -5px auto 0;
    border-radius: 4px;
}

.stylus-head {
    width: 14px;
    height: 24px;
    background: #222;
    margin: -5px auto 0;
    border-radius: 3px;
}

/* 4. 信息与进度条 */
.info-group {
    text-align: center;
}

.song-name {
    font-size: 1.6rem;
    font-weight: 600;
    margin: 0;
}

.artist {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 6px;
}

.progress-bar-group {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 16px;
}

.time-label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    width: 40px;
    text-align: center;
}

.slider-track {
    flex: 1;
    position: relative;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
}

.range-input {
    position: absolute;
    inset: 0;
    width: 100%;
    top: -11px;
    opacity: 0;
    cursor: pointer;
    z-index: 3;
}

.fill-bar {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: #fff;
    border-radius: 4px;
    pointer-events: none;
}

.fill-bar::after {
    content: '';
    position: absolute;
    right: -4px;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

/* 5. 控制按钮 (统一背景) */
.controls-group {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 15%;
}

.main-controls {
    display: flex;
    align-items: center;
    gap: 35px;
}

.btn-main,
.btn-secondary {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
}

.btn-play-state {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #fff;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
}

/* 这里的暂停播放依然保留 CSS 绘图，因为你是黑色的实心图标 */
.icon-play {
    width: 0;
    height: 0;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-left: 16px solid #000;
    margin-left: 4px;
}

.icon-pause {
    width: 16px;
    height: 20px;
    border-left: 5px solid #000;
    border-right: 5px solid #000;
    box-sizing: border-box;
}

/* 6. 播放列表 */
.playlist-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 100;
    display: flex;
    align-items: flex-end;
}

.playlist-card {
    width: 100%;
    height: 60%;
    background: #181818;
    border-radius: 24px 24px 0 0;
    padding: 24px;
    display: flex;
    flex-direction: column;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    color: #888;
}

.close-btn {
    background: #333;
    border: none;
    color: #fff;
    padding: 6px 16px;
    border-radius: 18px;
}

.list-items {
    flex: 1;
    overflow-y: auto;
}

.item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid #222;
}

.active .item-title {
    color: #1db954;
    font-weight: bold;
}

.item-artist-sub {
    font-size: 0.8rem;
    color: #555;
    display: block;
    margin-top: 4px;
}

.item-right {
    display: flex;
    align-items: center;
    gap: 15px;
}

.item-del-btn {
    background: rgba(255, 255, 255, 0.05);
    border: none;
    color: #666;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
}

.playing-bars {
    display: flex;
    gap: 2px;
    align-items: flex-end;
    height: 14px;
}

.playing-bars span {
    width: 3px;
    background: #1db954;
    animation: barUp 0.5s ease-in-out infinite alternate;
}

@keyframes barUp {
    from {
        height: 4px;
    }

    to {
        height: 14px;
    }
}

.add-track-btn {
    display: block;
    text-align: center;
    padding: 20px;
    color: #555;
    border: 1px dashed #333;
    border-radius: 12px;
    margin-top: 20px;
}

.slide-enter-active,
.slide-leave-active {
    transition: 0.4s ease;
}

.slide-enter-from,
.slide-leave-to {
    transform: translateY(100%);
}
</style>