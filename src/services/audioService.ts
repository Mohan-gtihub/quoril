
/**
 * Audio Service for Quoril
 * Handles tactical UI sounds using Web Audio API for a professional, asset-free experience.
 */

class AudioService {
    private ctx: AudioContext | null = null;
    private masterVolume: GainNode | null = null;

    private init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterVolume = this.ctx.createGain();
        this.masterVolume.connect(this.ctx.destination);
    }

    private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.5) {
        this.init();
        if (!this.ctx || !this.masterVolume) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterVolume);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    /**
     * Tactical "Ping" - Used for interval alerts
     */
    playAlert() {
        // High frequency crisp beep
        this.playTone(880, 'sine', 0.5, 0.3);
        setTimeout(() => this.playTone(1760, 'sine', 0.2, 0.1), 50);
    }

    /**
     * Success "Chime" - Used for task completion
     */
    playSuccess() {
        // Rising melodic sequence
        [440, 554.37, 659.25, 880].forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 'sine', 0.8, 0.2);
            }, i * 150);
        });
    }

    /**
     * Start Focus "Pulse"
     */
    playStart() {
        this.playTone(220, 'square', 0.1, 0.1);
        setTimeout(() => this.playTone(440, 'sine', 0.3, 0.2), 100);
    }

    /**
     * Stop/End session sound
     */
    playEnd() {
        this.playTone(440, 'sine', 0.2, 0.2);
        setTimeout(() => this.playTone(220, 'sine', 0.5, 0.2), 150);
    }
}

export const audioService = new AudioService();
