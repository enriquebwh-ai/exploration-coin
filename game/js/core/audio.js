const AudioManager = {
    sounds: {},
    context: null,
    initialized: false,

    init() {
        if (this.initialized) return;

        this.sounds = {
            click: () => this.createTone(800, 0.05, 'sine'),
            explore: () => this.playNoise(0.3, 'low'),
            exploreComplete: () => this.playExploreComplete(),
            anomaly: () => this.playAnomaly(),
            tokenFound: () => this.playTokenFound(),
            error: () => this.playError(),
            hover: () => this.createTone(600, 0.03, 'sine'),
            autoStart: () => this.createTone(400, 0.1, 'square'),
            autoStop: () => this.createTone(300, 0.1, 'triangle'),
            uiClick: () => this.createTone(1000, 0.02, 'sine')
        };

        this.initialized = true;
    },

    createTone(frequency, duration, type) {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);

        oscillator.start(this.context.currentTime);
        oscillator.stop(this.context.currentTime + duration);
    },

    playNoise(duration, type) {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }

        const bufferSize = this.context.sampleRate * duration;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.05;
        }

        const source = this.context.createBufferSource();
        const gainNode = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        source.buffer = buffer;

        if (type === 'low') {
            filter.type = 'lowpass';
            filter.frequency.value = 400;
        } else {
            filter.type = 'highpass';
            filter.frequency.value = 2000;
        }

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.context.destination);

        gainNode.gain.setValueAtTime(0.2, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);

        source.start();
    },

    playExploreComplete() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }

        const now = this.context.currentTime;

        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.connect(gain);
            gain.connect(this.context.destination);

            osc.frequency.value = freq;
            osc.type = 'sine';

            gain.gain.setValueAtTime(0, now + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);

            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.3);
        });
    },

    playAnomaly() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }

        const now = this.context.currentTime;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.connect(gain);
        gain.connect(this.context.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.4);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.start(now);
        osc.stop(now + 0.5);
    },

    playTokenFound() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }

        const now = this.context.currentTime;

        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.connect(gain);
            gain.connect(this.context.destination);

            osc.frequency.value = freq;
            osc.type = 'sine';

            gain.gain.setValueAtTime(0, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.5);
        });
    },

    playError() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }

        const now = this.context.currentTime;

        [200, 150].forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.connect(gain);
            gain.connect(this.context.destination);

            osc.frequency.value = freq;
            osc.type = 'square';

            gain.gain.setValueAtTime(0.1, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.15);

            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.15);
        });
    },

    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }
};
