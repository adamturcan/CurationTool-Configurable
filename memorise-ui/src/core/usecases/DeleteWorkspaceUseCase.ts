import type { WorkspaceRepository } from '../interfaces/WorkspaceRepository';
import { requireWorkspaceId, requireExistingWorkspace } from './validators';

const OPERATION = 'DeleteWorkspaceUseCase';

export interface DeleteWorkspaceRequest {
  workspaceId: string;
}

/** Deletes a workspace by ID after verifying it exists */
export class DeleteWorkspaceUseCase {
  private readonly workspaceRepository: WorkspaceRepository;

  constructor(workspaceRepository: WorkspaceRepository) {
    this.workspaceRepository = workspaceRepository;
  }

  async execute(request: DeleteWorkspaceRequest): Promise<void> {
    const workspaceId = requireWorkspaceId(request.workspaceId, OPERATION);
    await requireExistingWorkspace(this.workspaceRepository, workspaceId, OPERATION);
    await this.workspaceRepository.delete(workspaceId);
  }
}


