import type { WorkspaceRepository } from '../interfaces/WorkspaceRepository';
import type { TranslationDTO } from '../../types';
import { WorkspaceTranslation } from '../entities/Workspace';
import { requireWorkspaceId, requireTranslationLanguage, requireExistingWorkspace } from './validators';

const OPERATION = 'SyncWorkspaceTranslationsUseCase';

/** Replaces all translations on a workspace — translations array is the new complete set */
export interface SyncWorkspaceTranslationsRequest {
  workspaceId: string;
  translations: TranslationDTO[];
}

/** Replaces all translations on a workspace with a new set from DTOs */
export class SyncWorkspaceTranslationsUseCase {
  private readonly workspaceRepository: WorkspaceRepository;

  constructor(workspaceRepository: WorkspaceRepository) {
    this.workspaceRepository = workspaceRepository;
  }

  async execute(request: SyncWorkspaceTranslationsRequest) {
    const workspaceId = requireWorkspaceId(request.workspaceId, OPERATION);
    const workspace = await requireExistingWorkspace(this.workspaceRepository, workspaceId, OPERATION);

    const translations = (request.translations ?? []).map((translation) => {
      requireTranslationLanguage(translation.language, OPERATION);
      // Use fromDto to properly handle Translation DTO with segmentTranslations
      return WorkspaceTranslation.fromDto(translation);
    });

    const updated = workspace.withTranslations(translations);
    await this.workspaceRepository.save(updated);
    return updated;
  }
}


