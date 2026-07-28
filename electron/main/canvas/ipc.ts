import { ipcMain } from 'electron'
import { canvasOps, blockOps, connectionOps, zoneOps } from './repo'
import { unfurlLink } from './unfurl'
import {
    validateBlock,
    validateBlockBatch,
    validateCanvas,
    validateCanvasPatch,
    validateConnection,
    validateExternalUrl,
    validateId,
    validateIdBatch,
    validateZone,
} from '../ipcValidation'

export function registerCanvasIpc() {
    ipcMain.handle('canvas:unfurlLink', (_, url: string) => unfurlLink(validateExternalUrl(url)))

    ipcMain.handle('canvas:list', (_, userId: string) => canvasOps.list(validateId(userId, 'user id')))
    ipcMain.handle('canvas:get', (_, id: string) => canvasOps.get(validateId(id, 'canvas id')))
    ipcMain.handle('canvas:create', (_, c: any) => canvasOps.create(validateCanvas(c)))
    ipcMain.handle('canvas:update', (_, id: string, patch: any) => canvasOps.update(validateId(id, 'canvas id'), validateCanvasPatch(patch)))
    ipcMain.handle('canvas:softDelete', (_, id: string) => canvasOps.softDelete(validateId(id, 'canvas id')))

    ipcMain.handle('canvas:listBlocks', (_, canvasId: string) => blockOps.list(validateId(canvasId, 'canvas id')))
    ipcMain.handle('canvas:upsertBlock', (_, b: any) => blockOps.upsert(validateBlock(b)))
    ipcMain.handle('canvas:upsertBlocksBatch', (_, bs: any[]) => blockOps.upsertBatch(validateBlockBatch(bs)))
    ipcMain.handle('canvas:softDeleteBlock', (_, id: string) => blockOps.softDelete(validateId(id, 'block id')))
    ipcMain.handle('canvas:softDeleteBlocksBatch', (_, ids: string[]) => blockOps.softDeleteBatch(validateIdBatch(ids, 'block ids')))

    ipcMain.handle('canvas:listConnections', (_, canvasId: string) => connectionOps.list(validateId(canvasId, 'canvas id')))
    ipcMain.handle('canvas:upsertConnection', (_, c: any) => connectionOps.upsert(validateConnection(c)))
    ipcMain.handle('canvas:softDeleteConnection', (_, id: string) => connectionOps.softDelete(validateId(id, 'connection id')))

    ipcMain.handle('canvas:listZones', (_, canvasId: string) => zoneOps.list(validateId(canvasId, 'canvas id')))
    ipcMain.handle('canvas:upsertZone', (_, z: any) => zoneOps.upsert(validateZone(z)))
    ipcMain.handle('canvas:softDeleteZone', (_, id: string) => zoneOps.softDelete(validateId(id, 'zone id')))
}
