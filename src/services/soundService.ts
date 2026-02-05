export const soundService = {
    playAlert: (type: string) => {
        const soundMap: Record<string, string> = {
            'beep': 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
            'ping': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
            'sonar': 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
            'Melodic': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'
        }
        const audio = new Audio(soundMap[type] || soundMap['beep'])
        audio.volume = 0.4
        audio.play().catch(e => console.warn('Audio play failed', e))
    },
    playSuccess: (type: string) => {
        const soundMap: Record<string, string> = {
            'Victory Bell': 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
            'Futuristic': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'
        }
        const audio = new Audio(soundMap[type] || soundMap['Victory Bell'])
        audio.volume = 0.5
        audio.play().catch(e => console.warn('Audio play failed', e))
    }
}
