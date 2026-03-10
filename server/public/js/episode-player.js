function episodePlayer() {
    return {
        playing: false,
        currentTime: 0,
        duration: 0,
        progress: 0,

        init() {
            const audio = this.$refs.audio;
            if (!audio) return;
            audio.addEventListener('loadedmetadata', () => { this.duration = audio.duration; });
            audio.addEventListener('timeupdate', () => {
                this.currentTime = audio.currentTime;
                this.progress = (audio.currentTime / audio.duration) * 100;
            });
            audio.addEventListener('ended', () => { this.playing = false; this.progress = 0; });
        },

        togglePlay() {
            const audio = this.$refs.audio;
            this.playing ? audio.pause() : audio.play();
            this.playing = !this.playing;
        },

        seek(event) {
            const bar = event.currentTarget;
            this.$refs.audio.currentTime = (event.offsetX / bar.offsetWidth) * this.$refs.audio.duration;
        },

        formatTime(seconds) {
            if (!seconds || isNaN(seconds)) return '0:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    };
}