/**
 * Audio Visualizer for BUG Radio
 * - Tries real frequency analysis first
 * - Falls back to fake animation if CORS blocks access
 */

class AudioVisualizer {
    constructor(options = {}) {
        this.audioElement = options.audioElement || document.querySelector('audio');
        this.container = options.container || document.getElementById('visualizer');
        this.barCount = options.barCount || 32;
        this.barWidth = options.barWidth || 3;
        this.barGap = options.barGap || 2;
        this.barColor = options.barColor || '#333';
        this.minHeight = options.minHeight || 2;
        this.maxHeight = options.maxHeight || 30;
        
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.isReal = false;
        this.animationId = null;
        this.bars = [];
        
        this.init();
    }

    init() {
        this.createBars();
        this.tryRealVisualizer();
    }

    createBars() {
        this.container.innerHTML = '';
        this.container.style.display = 'flex';
        this.container.style.alignItems = 'flex-end';
        this.container.style.gap = `${this.barGap}px`;
        this.container.style.height = `${this.maxHeight}px`;

        for (let i = 0; i < this.barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'visualizer-bar';
            bar.style.width = `${this.barWidth}px`;
            bar.style.height = `${this.minHeight}px`;
            bar.style.backgroundColor = this.barColor;
            bar.style.borderRadius = '1px';
            bar.style.transition = 'height 0.05s ease';
            this.container.appendChild(bar);
            this.bars.push(bar);
        }
    }

    tryRealVisualizer() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 64;
            
            const source = this.audioContext.createMediaElementSource(this.audioElement);
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.isReal = true;
            console.log('Audio Visualizer: Using real frequency data');
        } catch (e) {
            console.log('Audio Visualizer: CORS blocked, using fake animation', e);
            this.isReal = false;
        }
    }

    start() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        if (this.isReal) {
            this.animateReal();
        } else {
            this.animateFake();
        }
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.resetBars();
    }

    resetBars() {
        this.bars.forEach(bar => {
            bar.style.height = `${this.minHeight}px`;
        });
    }

    // Real visualizer using Web Audio API
    animateReal() {
        this.analyser.getByteFrequencyData(this.dataArray);
        
        const step = Math.floor(this.dataArray.length / this.barCount);
        
        for (let i = 0; i < this.barCount; i++) {
            const value = this.dataArray[i * step];
            const height = Math.max(this.minHeight, (value / 255) * this.maxHeight);
            this.bars[i].style.height = `${height}px`;
        }

        this.animationId = requestAnimationFrame(() => this.animateReal());
    }

    // Fake visualizer animation
    animateFake() {
        const time = Date.now() / 1000;
        
        for (let i = 0; i < this.barCount; i++) {
            // Create organic-looking wave pattern
            const wave1 = Math.sin(time * 3 + i * 0.3) * 0.5 + 0.5;
            const wave2 = Math.sin(time * 5 + i * 0.5) * 0.3 + 0.5;
            const wave3 = Math.sin(time * 7 + i * 0.2) * 0.2 + 0.5;
            const random = Math.random() * 0.2;
            
            const combined = (wave1 + wave2 + wave3 + random) / 2;
            const height = this.minHeight + combined * (this.maxHeight - this.minHeight);
            
            this.bars[i].style.height = `${height}px`;
        }

        this.animationId = requestAnimationFrame(() => this.animateFake());
    }

    // Switch to fake if real fails during playback
    switchToFake() {
        this.isReal = false;
        console.log('Audio Visualizer: Switched to fake animation');
    }
}

// Auto-initialize if elements exist
document.addEventListener('DOMContentLoaded', () => {
    const audio = document.querySelector('audio');
    const container = document.getElementById('visualizer');
    
    if (audio && container) {
        const visualizer = new AudioVisualizer({
            audioElement: audio,
            container: container,
            barCount: 32,
            barColor: '#333'
        });

        audio.addEventListener('play', () => visualizer.start());
        audio.addEventListener('pause', () => visualizer.stop());
        audio.addEventListener('ended', () => visualizer.stop());

        // Expose globally if needed
        window.audioVisualizer = visualizer;
    }
});
