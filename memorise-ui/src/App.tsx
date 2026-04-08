import { useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import {
  CssBaseline,
  ThemeProvider,
  Box,
} from "@mui/material";
import theme from "./shared/theme";
import {
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import BubbleSidebar from "./presentation/components/sidebar/BubbleSidebar";
import { useWorkspaceStore, useNotificationStore, useAuthStore } from "./presentation/stores";
import { getWorkspaceApplicationService } from "./infrastructure/providers/workspaceProvider";
import { getAuthService } from "./infrastructure/providers/authProvider";
import type { WorkspaceDTO } from "./types";
import { NotificationSnackbar } from "./presentation/components/shared/NotificationSnackbar";
import { StateSynchronizer } from "./presentation/components/shared/StateSynchronizer";
import { useState } from "react";

// Lazy load pages for code splitting
const AccountPage = lazy(() => import("./presentation/pages/AccoutPage"));
const WorkspacePage = lazy(() => import("./presentation/pages/WorkspacePage"));
const ManageWorkspacesPage = lazy(() => import("./presentation/pages/ManageWorkspacesPage"));
const LoginPage = lazy(() => import("./presentation/pages/LoginPage"));
const AdminPage = lazy(() => import("./presentation/pages/AdminPage"));

// Component that creates a new workspace and redirects to it or manage page
const NewWorkspaceRedirect: React.FC<{
  onCreate: () => Promise<WorkspaceDTO | null>;
}> = ({ onCreate }) => {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    void onCreate().then((ws) => {
      if (!isMounted) return;
      if (ws?.id) {
        navigate(`/workspace/${encodeURIComponent(ws.id)}`, { replace: true });
      } else {
        navigate("/manage-workspaces", { replace: true });
      }
    });

    return () => { isMounted = false; };
  }, [navigate, onCreate]);

  return null;
};

/** Root application component handling auth, routing, sidebar, and workspace lifecycle */
const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Auth state from store
  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isLoading);

  // Track sidebar open state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Access Zustand store state
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const addWorkspaceMetadata = useWorkspaceStore((state) => state.addWorkspaceMetadata);

  // Access notification store
  const current = useNotificationStore((state) => state.current);
  const dequeue = useNotificationStore.getState().dequeue;
  const notify = useNotificationStore.getState().enqueue;

  // Memoize workspace application service
  const workspaceApplicationService = useMemo(
    () => getWorkspaceApplicationService(),
    []
  );

  // Hydrate auth state on mount
  useEffect(() => {
    void (async () => {
      try {
        const authService = getAuthService();
        const existingUser = await authService.getCurrentUser();
        useAuthStore.getState().setUser(existingUser);
      } catch {
        useAuthStore.getState().clearAuth();
      }
      useAuthStore.getState().setLoading(false);
    })();
  }, []);

  // Handle login: update auth store and navigate
  const handleLogin = useCallback(async (username: string, password?: string) => {
    try {
      const authService = getAuthService();
      const result = await authService.login({ username, password: password ?? '' });
      useAuthStore.getState().setUser(result.user);
      navigate("/manage-workspaces");
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      useAuthStore.getState().setError(message);
      throw err;
    }
  }, [navigate]);

  // Handle registration (server mode only)
  const handleRegister = useCallback(async (username: string, email: string, password: string) => {
    try {
      const authService = getAuthService();
      const result = await authService.register({ username, email, password });
      useAuthStore.getState().setUser(result.user);
      navigate("/manage-workspaces");
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      useAuthStore.getState().setError(message);
      throw err;
    }
  }, [navigate]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    const authService = getAuthService();
    await authService.logout();
    useAuthStore.getState().clearAuth();
    useWorkspaceStore.setState({ workspaces: [], owner: null });
    navigate("/login");
  }, [navigate]);

  // Create a new workspace draft, persist it, and update UI metadata
  const handleAddWorkspace = useCallback(async (): Promise<WorkspaceDTO | null> => {
    if (!user) return null;

    const currentWorkspaces = useWorkspaceStore.getState().workspaces;
    const newCount = currentWorkspaces.filter((w) =>
      w.name.startsWith("New Workspace")
    ).length;

    const ws = workspaceApplicationService.createWorkspaceDraft(
      user.id,
      `New Workspace #${newCount + 1}`
    );

    try {
      await workspaceApplicationService.createWorkspace({
        ownerId: user.id,
        workspaceId: ws.id,
        name: ws.name,
        isTemporary: ws.isTemporary,
      });

      addWorkspaceMetadata({
        id: ws.id!,
        name: ws.name,
        owner: user.id,
        updatedAt: ws.updatedAt ?? Date.now(),
      });

      return ws;
    } catch (error) {
      console.error("Failed to create workspace:", error);
      notify({ message: "Failed to create new workspace", tone: "error" });
      return null;
    }
  }, [user, workspaceApplicationService, addWorkspaceMetadata, notify]);

  // Move the opened workspace to the front of the list
  const bumpWorkspaceToFront = (id: string) => {
    const currentWorkspaces = useWorkspaceStore.getState().workspaces;
    const idx = currentWorkspaces.findIndex((w) => w.id === id);
    if (idx <= 0) return;

    const next = [...currentWorkspaces];
    const [item] = next.splice(idx, 1);
    next.unshift(item);

    useWorkspaceStore.setState({ workspaces: next });
  };

  // Bump workspace to front of list when navigating to a workspace
  useEffect(() => {
    const m = location.pathname.match(/^\/workspace\/([^/]+)$/);
    if (!m) return;
    const id = decodeURIComponent(m[1]);
    if (id !== "new") bumpWorkspaceToFront(id);
  }, [location.pathname]);

  // Show loading splash during auth hydration
  if (isAuthLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            display: "grid",
            placeItems: "center",
            backgroundColor: "background.default",
          }}
        >
          <img
            src={import.meta.env.BASE_URL + "memorise.png"}
            alt="Memorise"
            style={{ height: 36, opacity: 0.7 }}
          />
        </Box>
      </ThemeProvider>
    );
  }

  // Render login page when user is not authenticated
  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Suspense fallback={
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              display: "grid",
              placeItems: "center",
              backgroundColor: "background.default",
            }}
          >
            <img
              src={import.meta.env.BASE_URL + "memorise.png"}
              alt="Memorise"
              style={{ height: 36, opacity: 0.7 }}
            />
          </Box>
        }>
          <Routes>
            <Route
              path="/login"
              element={<LoginPage onLogin={handleLogin} onRegister={handleRegister} />}
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </ThemeProvider>
    );
  }

  // Render the main application
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <StateSynchronizer>
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            width: "100%",
            overflow: "clip",
            background: "linear-gradient(135deg, #2f3e34 0%, #8d7f57 100%)",
          }}
          >
        <BubbleSidebar
          onLogout={handleLogout}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          workspaces={workspaces}
        />
        <Box
          sx={{
            flexGrow: 1,
            px: { xs: 0, sm: 4 },
            ml: { xs: 10, sm: sidebarOpen ? 20 : 5 },
            pt: { xs: 0, sm: 5 },
            transition: "margin-left 0.3s ease",
          }}
        >
          <Suspense fallback={
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "200px",
              }}
            >
              <img
                src={import.meta.env.BASE_URL + "memorise.png"}
                alt="Loading"
                style={{ height: 24, opacity: 0.5 }}
              />
            </Box>
          }>
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/manage-account" replace />}
              />
              <Route
                path="/workspace/new"
                element={<NewWorkspaceRedirect onCreate={handleAddWorkspace} />}
              />
              <Route
                path="/workspace/:id"
                element={<WorkspacePage />}
              />
              <Route
                path="/manage-account"
                element={
                  <AccountPage username={user.username} workspaces={workspaces} />
                }
              />
              <Route
                path="/manage-workspaces"
                element={
                  <ManageWorkspacesPage />
                }
              />
              <Route
                path="/admin"
                element={<AdminPage />}
              />
              <Route
                path="*"
                element={<Navigate to="/manage-workspaces" replace />}
              />
            </Routes>
          </Suspense>
        </Box>
        {current && (
          <NotificationSnackbar
            message={current.message}
            onClose={dequeue}
            tone={current.tone}
            persistent={current.persistent}
          />
        )}
        </Box>
      </StateSynchronizer>
    </ThemeProvider>
  );
};

export default App;
