import { ipcMain } from 'electron'
import { canvasOps, blockOps, connectionOps, zoneOps } from './repo'
import { unfurlLink } from './unfurl'

export function registerCanvasIpc() {
    ipcMain.handle('canvas:unfurlLink', (_, url: string) => unfurlLink(url))

    ipcMain.handle('canvas:list', (_, userId: string) => canvasOps.list(userId))
    ipcMain.handle('canvas:get', (_, id: string) => canvasOps.get(id))
    ipcMain.handle('canvas:create', (_, c: any) => canvasOps.create(c))
    ipcMain.handle('canvas:update', (_, id: string, patch: any) => canvasOps.update(id, patch))
    ipcMain.handle('canvas:softDelete', (_, id: string) => canvasOps.softDelete(id))

    ipcMain.handle('canvas:listBlocks', (_, canvasId: string) => blockOps.list(canvasId))
    ipcMain.handle('canvas:upsertBlock', (_, b: any) => blockOps.upsert(b))
    ipcMain.handle('canvas:upsertBlocksBatch', (_, bs: any[]) => blockOps.upsertBatch(bs))
    ipcMain.handle('canvas:softDeleteBlock', (_, id: string) => blockOps.softDelete(id))
    ipcMain.handle('canvas:softDeleteBlocksBatch', (_, ids: string[]) => blockOps.softDeleteBatch(ids))

    ipcMain.handle('canvas:listConnections', (_, canvasId: string) => connectionOps.list(canvasId))
    ipcMain.handle('canvas:upsertConnection', (_, c: any) => connectionOps.upsert(c))
    ipcMain.handle('canvas:softDeleteConnection', (_, id: string) => connectionOps.softDelete(id))

    ipcMain.handle('canvas:listZones', (_, canvasId: string) => zoneOps.list(canvasId))
    ipcMain.handle('canvas:upsertZone', (_, z: any) => zoneOps.upsert(z))
    ipcMain.handle('canvas:softDeleteZone', (_, id: string) => zoneOps.softDelete(id))
}
