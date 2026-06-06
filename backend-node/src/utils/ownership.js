import { Project } from '../models/Project.js';
import { ApiError } from '../middleware/error.js';

// Loads a non-deleted project and verifies the requesting user owns it.
export async function loadOwnedProject(projectId, userId) {
  const project = await Project.findOne({ _id: projectId, deletedAt: null });
  if (!project) throw new ApiError(404, 'Projet introuvable');
  if (project.user.toString() !== userId.toString()) {
    throw new ApiError(403, 'Accès refusé');
  }
  return project;
}
