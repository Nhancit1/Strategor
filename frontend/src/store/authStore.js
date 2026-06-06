import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, configureApi } from '../api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      isAuthenticated: () => !!get().accessToken,

      login: async (email, password) => {
        const { data } = await authApi.login({ email, password });
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });
        return data.user;
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) await authApi.logout(refreshToken);
        } catch (e) {
          // ignore
        } finally {
          set({ accessToken: null, refreshToken: null, user: null });
        }
      },

      updateTokens: ({ accessToken, refreshToken }) => {
        set({ accessToken, refreshToken });
      },

      // Forced or normal password change. Backend returns fresh tokens + user
      // (mustChangePassword cleared) so we refresh the whole session at once.
      changePassword: async (currentPassword, newPassword) => {
        const { data } = await authApi.changePassword(currentPassword, newPassword);
        set({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
        return data.user;
      },

      // Called on 403 PASSWORD_CHANGE_REQUIRED: flip the flag so the route
      // guard redirects to the change-password screen.
      flagPasswordChange: () => {
        const u = get().user;
        if (u && !u.mustChangePassword) set({ user: { ...u, mustChangePassword: true } });
      },

      isAdmin: () => get().user?.role === 'ADMIN',

      setUser: (user) => set({ user }),
    }),
    {
      name: 'stratege-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);

// Wire l'API client sur le store
configureApi({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokensRefreshed: (tokens) => useAuthStore.getState().updateTokens(tokens),
  onLogout: () => useAuthStore.getState().logout(),
  onPasswordChangeRequired: () => useAuthStore.getState().flagPasswordChange(),
});
