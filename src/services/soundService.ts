export const soundService = {
    playAlert: (type: string) => {
        const soundMap: Record<string, string> = {
            'ping': '/sounds/ping.mp3',
            'sonar': '/sounds/sonar.mp3', // ... (mappings assumed correct)
        }
        // Fallback beep function using Web Audio API
        const fallbackBeep = () => {
            try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.type = 'sine'
                osc.frequency.setValueAtTime(880, ctx.currentTime)
                osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1)
                gain.gain.setValueAtTime(0.1, ctx.currentTime)
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
                osc.start()
                osc.stop(ctx.currentTime + 0.1)
            } catch (e) { console.error('Fallback beep failed', e) }
        }

        const src = soundMap[type] || '/sounds/ping.mp3' // direct path fallback
        try {
            const audio = new Audio(src)
            audio.volume = 1.0 // Unmute / Max Volume
            const contentPromise = audio.play()
            if (contentPromise !== undefined) {
                contentPromise.catch(e => {
                    console.warn('[SoundService] Audio play failed, using fallback:', e)
                    fallbackBeep()
                })
            }
        } catch (e) {
            console.error('[SoundService] Failed to create audio:', e)
            fallbackBeep()
        }
    },
    playSuccess: (type: string) => {
        const soundMap: Record<string, string> = {
            'Victory Bell': '/sounds/achievement.mp3', // Map to existing
            'Futuristic': '/sounds/ping.mp3',
            'Achievement': '/sounds/achievement.mp3',
            'Magic Reveal': '/sounds/reveal.mp3',
            'Data Uplink': '/sounds/reveal.mp3', // Fallback to reveal
            'Level Up': '/sounds/levelup.mp3'
        }
        const src = soundMap[type] || soundMap['Victory Bell']
        try {
            const audio = new Audio(src)
            audio.volume = 0.5
            audio.play().catch(e => {
                console.warn('[SoundService] Audio play failed:', e)
                console.log('[SoundService] Attempted to play:', src)
            })
        } catch (e) {
            console.error('[SoundService] Failed to create audio:', e)
        }
    }
}
