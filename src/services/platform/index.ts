import type { Platform } from './types'
import { webPlatform } from './web'
import { electronPlatform } from './electron'

let _platform: Platform | null = null

export function getPlatform(): Platform {
  if (_platform) return _platform
  const isElectron =
    (import.meta as any).env?.VITE_TARGET !== 'web' &&
    typeof window !== 'undefined' && !!(window as any).electronAPI
  _platform = isElectron ? electronPlatform : webPlatform
  return _platform
}

export const platform = getPlatform()
