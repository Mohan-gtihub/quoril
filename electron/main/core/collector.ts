import { exec } from 'child_process'
import { promisify } from 'util'
import { powerMonitor } from 'electron'

const execAsync = promisify(exec)

export interface ActiveWindow {
    appName: string
    title: string
    isIdle: boolean
}

export async function getActiveWindow(): Promise<ActiveWindow | null> {
    const idleTime = powerMonitor.getSystemIdleTime()
    const isIdle = idleTime > 60 // 1 minute threshold

    try {
        // PowerShell script to get foreground window property
        const script = `
            Add-Type @"
              using System;
              using System.Runtime.InteropServices;
              using System.Text;
              public class Win32 {
                [DllImport("user32.dll")]
                public static extern IntPtr GetForegroundWindow();
                [DllImport("user32.dll")]
                public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
                [DllImport("user32.dll")]
                public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
              }
"@
            $hWnd = [Win32]::GetForegroundWindow()
            $sb = New-Object System.Text.StringBuilder 256
            [Win32]::GetWindowText($hWnd, $sb, $sb.Capacity) | Out-Null
            $processId = 0
            [Win32]::GetWindowThreadProcessId($hWnd, [ref]$processId) | Out-Null
            $p = Get-Process -Id $processId
            $name = $p.ProcessName
            $title = $sb.ToString()
            "@{appName='$name';title='$title'}"
        `

        const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`)

        // Very basic parse of the string returned
        const match = stdout.match(/appName='(.*?)';title='(.*?)'/)
        if (match) {
            return {
                appName: match[1],
                title: match[2],
                isIdle
            }
        }
    } catch (e) {
        // console.error('[Collector] Window tracking failed:', e)
    }

    return null
}
