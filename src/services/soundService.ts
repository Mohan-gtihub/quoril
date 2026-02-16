export const soundService = {
    playAlert: (type: string) => {
        const soundMap: Record<string, string> = {
            'ping': '/sounds/ping.mp3',
            'sonar': '/sounds/sonar.mp3',
            'radar': '/sounds/radar.mp3',
            'digital': '/sounds/ping.mp3', // Fallback to ping
            'crystal': '/sounds/crystal.mp3',
            'minimal': '/sounds/minimal.mp3',
            'beep': '/sounds/beep.mp3'
        }
        const src = soundMap[type] || soundMap['ping']
        try {
            const audio = new Audio(src)
            audio.volume = 0.4
            audio.play().catch(e => {
                console.warn('[SoundService] Audio play failed:', e)
                console.log('[SoundService] Attempted to play:', src)
            })
        } catch (e) {
            console.error('[SoundService] Failed to create audio:', e)
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
