import { create } from 'zustand';
import { projectApi, agentApi, financeApi } from '../api';

export const useProjectStore = create((set, get) => ({
  projects: [],
  current: null,
  onboarding: null,
  finance: null,
  financeCompleteness: 0,
  agents: [],
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await projectApi.list();
      set({ projects: data, loading: false });
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  createProject: async (body) => {
    const { data } = await projectApi.create(body);
    set({ projects: [data, ...get().projects], current: data });
    return data;
  },

  fetchProject: async (id) => {
    set({ loading: true });
    const { data } = await projectApi.get(id);
    set({ current: data, loading: false });
    return data;
  },

  deleteProject: async (id) => {
    await projectApi.remove(id);
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },

  fetchOnboarding: async (id) => {
    const { data } = await projectApi.getOnboarding(id);
    set({ onboarding: data });
    return data;
  },

  updateOnboarding: async (id, patch) => {
    const { data } = await projectApi.updateOnboarding(id, patch);
    set({ onboarding: data });
    return data;
  },

  fetchFinance: async (id) => {
    try {
      const { data } = await financeApi.get(id);
      set({ finance: data?.data || null, financeCompleteness: data?.completenessScore || 0 });
      return data;
    } catch (e) {
      // 204 No Content → pas encore de finance saisie
      set({ finance: null, financeCompleteness: 0 });
      return null;
    }
  },

  updateFinance: async (id, payload) => {
    const { data } = await financeApi.update(id, payload);
    set({ finance: data?.data || payload, financeCompleteness: data?.completenessScore || 0 });
    return data;
  },

  launchAnalysis: async (id, payload) => {
    const { data } = await projectApi.launchAnalysis(id, payload);
    set({ current: data });
    return data;
  },

  continueAnalysis: async (id) => {
    const { data } = await projectApi.continueAnalysis(id);
    set({ current: data });
    return data;
  },

  continueFromDiagnostic: async (id) => {
    const { data } = await projectApi.continueFromDiagnostic(id);
    set({ current: data });
    return data;
  },

  fetchAgents: async (id) => {
    const { data } = await agentApi.list(id);
    set({ agents: data });
    return data;
  },

  // Mise à jour via WebSocket (event push)
  updateAgentFromWs: (event) => {
    const agents = get().agents.map((a) =>
      a.agentId === event.agentId
        ? { ...a, status: event.status, progressPercent: event.progress, agentName: event.agentName }
        : a
    );
    // Si l'agent n'existait pas, l'ajouter
    if (!agents.some((a) => a.agentId === event.agentId)) {
      agents.push({
        agentId: event.agentId,
        agentName: event.agentName,
        status: event.status,
        progressPercent: event.progress,
      });
      agents.sort((a, b) => a.agentId - b.agentId);
    }
    set({ agents });
  },

  retryAgent: async (projectId, agentId) => {
    await agentApi.retry(projectId, agentId);
  },

  reset: () => set({ projects: [], current: null, onboarding: null, finance: null, financeCompleteness: 0, agents: [] }),
}));
