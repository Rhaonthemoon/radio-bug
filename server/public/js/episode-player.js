function episodePlayer(episodeId, initialPlays) {
    return {
        playing: false,
        muted: false,
        volume: 80,
        currentTime: 0,
        duration: 0,
        progress: 0,
        plays: initialPlays || 0,
        tracked: false,

        init() {
            const audio = this.$refs.audio;
            if (!audio) return;

            // Check if already tracked in this session
            if (episodeId) {
                this.tracked = sessionStorage.getItem('played_' + episodeId) === '1';
            }

            audio.addEventListener('loadedmetadata', () => { this.duration = audio.duration; });
            audio.addEventListener('timeupdate', () => {
                this.currentTime = audio.currentTime;
                this.progress = (audio.currentTime / audio.duration) * 100;
            });
            audio.addEventListener('ended', () => { this.playing = false; this.progress = 0; });
            audio.volume = this.volume / 100;
        },

        togglePlay() {
            const audio = this.$refs.audio;
            if (this.playing) {
                audio.pause();
            } else {
                audio.play();
                this.trackPlay();
            }
            this.playing = !this.playing;
        },

        trackPlay() {
            if (!episodeId || this.tracked) return;
            this.tracked = true;
            sessionStorage.setItem('played_' + episodeId, '1');

            fetch('/api/episodes/public/' + episodeId + '/play', { method: 'POST' })
                .then(function(r) { return r.json(); })
                .then(function(data) { if (data.plays) this.plays = data.plays; }.bind(this))
                .catch(function() {});
        },

        toggleMute() {
            this.muted = !this.muted;
            this.$refs.audio.muted = this.muted;
        },

        setVolume() {
            this.$refs.audio.volume = this.volume / 100;
        },

        seek(event) {
            var bar = event.currentTarget;
            this.$refs.audio.currentTime = (event.offsetX / bar.offsetWidth) * this.$refs.audio.duration;
        },

        formatTime(seconds) {
            if (!seconds || isNaN(seconds)) return '0:00';
            var mins = Math.floor(seconds / 60);
            var secs = Math.floor(seconds % 60);
            return mins + ':' + secs.toString().padStart(2, '0');
        }
    };
}