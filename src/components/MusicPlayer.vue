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
                <h1 class="song-name">{{ musicStore.currentTrack.title || '未播放' }}</h1>
                <p class="artist">{{ musicStore.currentTrack.artist || '未知艺术家' }}</p>
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
                    <button class="btn-secondary" @click="deleteCurrentTrack">
                        <i class="icon-delete"></i>
                    </button>
                    <button class="btn-main" @click="handlePrev">
                        <i class="icon-pre"></i>
                    </button>
                    <button class="btn-play-state" @click="togglePlay">
                        <div :class="isPlaying ? 'icon-pause' : 'icon-play'"></div>
                    </button>
                    <button class="btn-main" @click="handleNext">
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

        <audio ref="audioRef" @timeupdate="onTimeUpdate" @loadedmetadata="onMeta" @ended="handleEnded"></audio>
    </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useMusicStore } from '../stores/music'
import { get, set, del } from 'idb-keyval'

const musicStore = useMusicStore()
const audioRef = ref(null)
const isPlaying = ref(false)
const showList = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const defaultCover = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500'

// 1. 修改加载逻辑：增加对 track.url (默认音乐) 的支持
const loadTrackResource = async (index, shouldPlay = false) => {
    const track = musicStore.playlist[index]
    if (!track) return

    // 如果有 url (默认音乐)，直接用；否则去 get 数据库
    if (track.url) {
        audioRef.value.src = track.url
    } else {
        const file = await get(`file_${track.id}`)
        if (file) {
            if (audioRef.value.src.startsWith('blob:')) URL.revokeObjectURL(audioRef.value.src)
            audioRef.value.src = URL.createObjectURL(file)
        }
    }

    audioRef.value.load()
    if (shouldPlay) {
        audioRef.value.play().catch(() => { })
        isPlaying.value = true
    } else {
        isPlaying.value = false
    }
}

const togglePlay = () => {
    if (!audioRef.value.src) return
    isPlaying.value ? audioRef.value.pause() : audioRef.value.play().catch(() => { })
    isPlaying.value = !isPlaying.value
}

const handlePrev = () => {
    if (musicStore.playlist.length <= 1) {
        if (audioRef.value) { audioRef.value.currentTime = 0; audioRef.value.play().catch(() => { }); isPlaying.value = true; }
    } else { musicStore.prevTrack() }
}

const handleNext = () => {
    if (musicStore.playlist.length <= 1) {
        if (audioRef.value) { audioRef.value.currentTime = 0; audioRef.value.play().catch(() => { }); isPlaying.value = true; }
    } else { musicStore.nextTrack() }
}

const handleEnded = () => {
    if (musicStore.playlist.length > 1) { musicStore.nextTrack() }
    else { audioRef.value.currentTime = 0; audioRef.value.play() }
}

const selectTrack = (index) => { musicStore.currentIndex = index; loadTrackResource(index, true) }

const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const id = Date.now(); await set(`file_${id}`, file);
    // 上传的不带 url 属性
    musicStore.addTrack({ id, title: file.name.replace(/\.[^/.]+$/, ""), artist: '本地上传', cover: defaultCover })
}

const deleteCurrentTrack = async () => { if (musicStore.playlist.length > 0) await confirmDelete(musicStore.currentIndex) }

// 2. 修改删除逻辑：调用 store 内部的删除（内部已处理数据库逻辑）
const confirmDelete = async (index) => {
    if (index === musicStore.currentIndex) { if (audioRef.value) audioRef.value.pause(); isPlaying.value = false; }
    await musicStore.removeTrack(index);
    if (musicStore.playlist.length === 0) { audioRef.value.src = '' }
    else { loadTrackResource(musicStore.currentIndex, false) }
}

watch(() => musicStore.currentIndex, (newIdx) => loadTrackResource(newIdx, isPlaying.value))

// 3. 修改挂载逻辑：强制重置状态，防止持久化插件导致初次不显示默认列表
onMounted(() => {
    if (musicStore.playlist.length > 0) {
        loadTrackResource(musicStore.currentIndex, false)
    }
})

const onTimeUpdate = () => { currentTime.value = audioRef.value.currentTime }
const onMeta = () => { duration.value = audioRef.value.duration }
const seek = () => { audioRef.value.currentTime = currentTime.value }
const formatTime = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
</script>
<style scoped>
/* 1. 图标库 */
@font-face {
    font-family: 'icomoon';
    src: url('/fonts/icomoon.eot');
    src: url('/fonts/icomoon.eot#iefix') format('embedded-opentype'),
        url('/fonts/icomoon.ttf') format('truetype'),
        url('/fonts/icomoon.woff') format('woff'),
        url('/fonts/icomoon.svg#icomoon') format('svg');
}

.icon-pre,
.icon-next,
.icon-list,
.icon-delete {
    font-family: 'icomoon' !important;
    font-style: normal;
    font-size: 24px;
    color: #fff;
}

.icon-pre::before {
    content: "\e905";
    font-size: 26px;
}

.icon-next::before {
    content: "\e908";
    font-size: 26px;
}

.icon-list::before {
    content: "\e904";
}

.icon-delete::before {
    content: "\e909";
}

/* 2. 容器与背景 */
.player-container {
    position: relative;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    background-color: #000;
    color: #fff;
    display: flex;
    flex-direction: column;
}

.background-blur {
    position: absolute;
    inset: -10%;
    background-size: cover;
    background-position: center;
    filter: blur(50px) brightness(0.3);
    z-index: 0;
}

.background-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.8) 100%);
}

/* 3. 首页布局优化 */
.player-content {
    position: relative;
    z-index: 2;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 30px 0;
}

.vinyl-display {
    flex: 1.5;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin-top: 25px;
}

.vinyl-layout {
    position: relative;
    width: min(75vw, 320px);
    aspect-ratio: 1 / 1;
}

.disc {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #111;
    border: 8px solid #1a1a1a;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
}

.disc-vinyl {
    width: 96%;
    height: 96%;
    border-radius: 50%;
    background: repeating-radial-gradient(circle, #111 0, #111 2px, #080808 4px);
    display: flex;
    align-items: center;
    justify-content: center;
}

.disc-label {
    width: 38%;
    height: 38%;
    border-radius: 50%;
    border: 3px solid #000;
    overflow: hidden;
}

.disc-label img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.stylus {
    position: absolute;
    top: -40px;
    left: 50%;
    width: 30px;
    height: 100px;
    z-index: 10;
    transform-origin: 15px 15px;
    transform: rotate(-65deg);
    transition: transform 0.6s ease;
}

.stylus.is-playing {
    transform: rotate(-30deg);
}

.stylus-pivot {
    width: 30px;
    height: 30px;
    background: #444;
    border-radius: 50%;
}

.stylus-arm {
    width: 5px;
    height: 90px;
    background: #666;
    margin: -5px auto 0;
}

.rotate {
    animation: rotateDisc 20s linear infinite;
}

@keyframes rotateDisc {
    from {
        transform: translate(-50%, -50%) rotate(0deg);
    }

    to {
        transform: translate(-50%, -50%) rotate(360deg);
    }
}

/* 首页歌名控制：解决溢出换行 */
.info-group {
    text-align: center;
    padding: 0 12vw;
    width: 100%;
    box-sizing: border-box;
}

.song-name {
    color: #fff;
    font-weight: 600;
    margin: 0;
    font-size: clamp(1.2rem, 5vw, 1.8rem);
    line-height: 1.4;
    word-wrap: break-word;
    word-break: break-all;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
}

.artist {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 8px;
}

/* 4. 进度条与按钮 */
.progress-bar-group {
    width: 85%;
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 20px 0;
}

.time-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.3);
    width: 35px;
}

.slider-track {
    flex: 1;
    position: relative;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
}

.range-input {
    position: absolute;
    inset: 0;
    width: 100%;
    top: -15px;
    opacity: 0;
    cursor: pointer;
    z-index: 5;
}

.fill-bar {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: #fff;
    border-radius: 2px;
}

.main-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8vw;
    width: 100%;
}

.btn-play-state {
    width: 65px;
    height: 65px;
    border-radius: 50%;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.icon-play {
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-left: 18px solid #000;
    margin-left: 5px;
}

.icon-pause {
    width: 10px;
    height: 22px;
    border-left: 7px solid #000;
    border-right: 7px solid #000;
}

button {
    background: none;
    border: none;
    cursor: pointer;
    color: #fff;
    padding: 0;
}

/* 5. 播放列表：移动端核心修复 */
.playlist-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 100;
    display: flex;
    align-items: flex-end;
}

.playlist-card {
    width: 100%;
    height: 70vh;
    background: #1a1a1a;
    border-radius: 24px 24px 0 0;
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.list-items {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}

/* 列表项强行锁定两端 */
.item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    width: 100%;
    box-sizing: border-box;
    gap: 10px;
}

.item-info {
    flex: 1;
    min-width: 0;
    /* 允许收缩 */
    display: flex;
    flex-direction: column;
}

.item-title {
    color: #fff;
    font-size: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
}

.item-artist-sub {
    font-size: 0.8rem;
    color: #777;
    margin-top: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-right {
    flex-shrink: 0;
    /* 禁止收缩，确保删除按钮不动 */
    display: flex;
    align-items: center;
    gap: 15px;
    padding-left: 5px;
}

.item-del-btn {
    width: 36px;
    height: 36px;
    color: #666;
    font-size: 1.3rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.active .item-title {
    color: #1db954;
    font-weight: bold;
}

.add-track-btn {
    display: block;
    margin: 25px 0 10px;
    padding: 16px;
    text-align: center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    color: #1db954;
}

.slide-enter-active,
.slide-leave-active {
    transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
    transform: translateY(100%);
}

.playing-bars {
    display: flex;
    gap: 2px;
    align-items: flex-end;
    height: 12px;
}

.playing-bars span {
    width: 2px;
    background: #1db954;
    animation: barUp 0.6s infinite alternate;
}

@keyframes barUp {
    from {
        height: 2px;
    }

    to {
        height: 12px;
    }
}
</style>