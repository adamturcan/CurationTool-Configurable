import { Router } from 'express';
import type { DbAdapter } from '../db/DbAdapter.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import type { WorkspaceDTO } from '../types.js';

/**
 * Workspace CRUD routes mounted under `/api`.
 * Users can only act on their own workspaces; admins can act on any.
 */
export function workspaceRoutes(db: DbAdapter): Router {
  const router = Router();

  /** `GET /api/workspaces` - lists the caller's workspaces. Admins may pass `?owner=<id>` to list another user's. */
  router.get('/workspaces', authMiddleware, async (req, res) => {
    const ownerId = (req.query.owner as string) ?? req.user!.id;
    if (ownerId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    const workspaces = await db.findWorkspacesByOwner(ownerId);
    res.json(workspaces);
  });

  /** `GET /api/workspaces/:id` - returns a single workspace. */
  router.get('/workspaces/:id', authMiddleware, async (req, res) => {
    const id = req.params.id as string;
    const workspace = await db.findWorkspaceById(id);
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }
    if (workspace.owner !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    res.json(workspace);
  });

  /** `POST /api/workspaces` - creates a workspace. */
  router.post('/workspaces', authMiddleware, async (req, res) => {
    const dto = req.body as WorkspaceDTO;
    dto.owner = req.user!.id;
    await db.saveWorkspace(dto);
    res.status(201).json(dto);
  });

  /** `PUT /api/workspaces/:id` - replaces a workspace. */
  router.put('/workspaces/:id', authMiddleware, async (req, res) => {
    const id = req.params.id as string;
    const existing = await db.findWorkspaceById(id);
    if (existing && existing.owner !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    const dto = req.body as WorkspaceDTO;
    dto.id = id;
    dto.owner = req.user!.id;
    await db.saveWorkspace(dto);
    res.json(dto);
  });

  /** `DELETE /api/workspaces/:id` - removes a workspace. */
  router.delete('/workspaces/:id', authMiddleware, async (req, res) => {
    const id = req.params.id as string;
    const existing = await db.findWorkspaceById(id);
    if (!existing) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }
    if (existing.owner !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    await db.deleteWorkspace(id);
    res.sendStatus(204);
  });

  /** `PUT /api/workspaces/:id/segments` - replaces only the segment list of a workspace. */
  router.put('/workspaces/:id/segments', authMiddleware, async (req, res) => {
    const id = req.params.id as string;
    const existing = await db.findWorkspaceById(id);
    if (!existing) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }
    if (existing.owner !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    await db.updateSegments(id, req.body.segments ?? []);
    res.sendStatus(204);
  });

  return router;
}
