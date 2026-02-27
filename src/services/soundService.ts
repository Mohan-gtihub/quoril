import { Howl } from 'howler'

const SOUND_MAP: Record<string, string> = {
    // Base Sounds
    'ping': '/sounds/ping.mp3',
    'sonar': '/sounds/sonar.mp3',
    'beep': '/sounds/beep.mp3',
    'radar': '/sounds/radar.mp3',
    'minimal': '/sounds/minimal.mp3',
    'crystal': '/sounds/crystal.mp3',

    // Success Sounds
    'achievement': '/sounds/achievement.mp3',
    'levelup': '/sounds/levelup.mp3',
    'reveal': '/sounds/reveal.mp3',

    // Settings Mappings (Legacy Compat & Case Insensitivity)
    'Victory Bell': '/sounds/achievement.mp3',
    'victory bell': '/sounds/achievement.mp3',

    'Futuristic': '/sounds/ping.mp3',
    'futuristic': '/sounds/ping.mp3',

    'Magic Reveal': '/sounds/reveal.mp3',
    'magic reveal': '/sounds/reveal.mp3',

    'Data Uplink': '/sounds/radar.mp3',
    'data uplink': '/sounds/radar.mp3',

    'Level Up': '/sounds/levelup.mp3',
    'level up': '/sounds/levelup.mp3',

    'Chime': '/sounds/minimal.mp3',
    'chime': '/sounds/minimal.mp3'
}

class SoundService {
    private sounds: Record<string, Howl> = {}

    private getSound(name: string): Howl | null {
        // Robust lookup: Try direct, then lowercase
        let path = SOUND_MAP[name]
        if (!path && name) {
            path = SOUND_MAP[name.toLowerCase()]
        }

        if (!path) return null

        // Cache Key = Path (to share instances if multiple keys map to same file)
        const cacheKey = path

        if (!this.sounds[cacheKey]) {
            this.sounds[cacheKey] = new Howl({
                src: [path],
                volume: 0.6,
                preload: true,
                html5: true, // MUST BE TRUE! Web Audio API crashes this Electron version.
                format: ['mp3'],
                onloaderror: (_id, err) => {
                    console.warn(`[SoundService] Failed to load sound: ${name} (${path})`, err)
                },
                onplayerror: (_id, err) => {
                    console.warn(`[SoundService] Failed to play sound: ${name}`, err)
                }
            })
        }
        return this.sounds[cacheKey]
    }

    playAlert(type: string) {
        try {
            const sound = this.getSound(type) || this.getSound('ping')

            if (sound) {
                sound.volume(0.6)
                sound.play()
            }
        } catch (e) {
            console.error('[SoundService] Play Alert Error', e)
        }
    }

    playSuccess(type: string) {
        try {
            const sound = this.getSound(type) || this.getSound('achievement')

            if (sound) {
                sound.volume(0.6)
                sound.play()
            }
        } catch (e) {
            console.error('[SoundService] Play Success Error', e)
        }
    }
}

export const soundService = new SoundService()
