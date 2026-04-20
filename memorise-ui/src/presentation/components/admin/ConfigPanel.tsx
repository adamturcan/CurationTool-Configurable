import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import CancelIcon from "@mui/icons-material/Close";
import { shadows } from "../../../shared/theme";
import { getConfigService } from "../../../infrastructure/providers/configProvider";
import { getAuthService } from "../../../infrastructure/providers/authProvider";
import { getApiHealthService } from "../../../infrastructure/providers/apiHealthProvider";
import { useAuthStore } from "../../stores";
import type { HealthCheckResult } from "../../../infrastructure/services/ApiHealthService";
import type { ApiEndpointConfig } from "../../../core/interfaces/ConfigService";

interface AdapterSchema {
  request: unknown;
  response: unknown;
}

interface AdapterOption {
  key: string;
  name: string;
  schema?: AdapterSchema;
}

/**
 * Unified admin panel: shows config source, resolved endpoints, health status,
 * and allows editing endpoint URLs and adapters in server mode.
 */
const ConfigPanel: React.FC = () => {
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [configReady, setConfigReady] = useState(false);
  const [endpoints, setEndpoints] = useState<ApiEndpointConfig[]>([]);

  // Schema preview dialog
  const [schemaDialog, setSchemaDialog] = useState<{ name: string; schema: AdapterSchema } | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editedUrls, setEditedUrls] = useState<Record<string, string>>({});
  const [editedAdapters, setEditedAdapters] = useState<Record<string, string>>({});
  const [availableAdapters, setAvailableAdapters] = useState<Record<string, AdapterOption[]>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isServerMode = !!import.meta.env.VITE_BACKEND_URL;
  const backendUrl = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/$/, '');
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const canEdit = isServerMode && isAdmin;

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    const token = getAuthService().getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const runChecks = useCallback(async (eps: ApiEndpointConfig[]) => {
    setResults(
      eps.map((ep) => ({
        key: ep.key,
        name: ep.name,
        url: ep.url,
        status: "checking" as const,
        latencyMs: null,
        httpStatus: null,
        error: null,
        checkedAt: Date.now(),
      }))
    );

    if (isServerMode) {
      // In server mode, health checks go through the backend (avoids CORS issues)
      try {
        const response = await fetch(`${backendUrl}/api/health`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ endpoints: eps.map(ep => ({ key: ep.key, name: ep.name, url: ep.url })) }),
        });
        if (response.ok) {
          const checked = await response.json();
          setResults(checked);
          return;
        }
      } catch {
        // Fall through to client-side checks
      }
    }

    const checked = await getApiHealthService().checkAll(eps);
    setResults(checked);
  }, [isServerMode, backendUrl]);

  const fetchAvailableAdapters = useCallback(async () => {
    if (!isServerMode) return;
    try {
      const response = await fetch(`${backendUrl}/api/adapters`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json() as Record<string, AdapterOption[]>;
        setAvailableAdapters(data);
      }
    } catch {
      // Adapter list not critical
    }
  }, [isServerMode, backendUrl]);

  useEffect(() => {
    let cancelled = false;
    void fetchAvailableAdapters();

    (async () => {
      try {
        const config = await getConfigService().fetchConfig();
        if (cancelled) return;
        setEndpoints(config.endpoints);
        setConfigReady(true);
        setLoading(false);
        await runChecks(config.endpoints);
      } catch {
        if (!cancelled) {
          const eps = getConfigService().getEndpoints();
          setEndpoints(eps);
          setConfigReady(true);
          setLoading(false);
          await runChecks(eps);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [runChecks, fetchAvailableAdapters]);

  const handleRefresh = useCallback(async () => {
    await runChecks(endpoints);
  }, [runChecks, endpoints]);

  const startEditing = async () => {
    const urlMap: Record<string, string> = {};
    const adapterMap: Record<string, string> = {};
    for (const ep of endpoints) {
      urlMap[ep.key] = ep.url;
      adapterMap[ep.key] = ep.adapter ?? '';
    }
    setEditedUrls(urlMap);
    setEditedAdapters(adapterMap);
    setSaveError(null);
    setEditing(true);
    await fetchAvailableAdapters();
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditedUrls({});
    setEditedAdapters({});
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    const updated = endpoints.map((ep) => ({
      ...ep,
      url: editedUrls[ep.key] ?? ep.url,
      adapter: editedAdapters[ep.key] || ep.adapter,
    }));

    try {
      await getConfigService().saveConfig({ endpoints: updated });
      setEndpoints(updated);
      setEditing(false);
      setEditedUrls({});
      setEditedAdapters({});
      await runChecks(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = endpoints.some(
    (ep) =>
      (editedUrls[ep.key] !== undefined && editedUrls[ep.key] !== ep.url) ||
      (editedAdapters[ep.key] !== undefined && editedAdapters[ep.key] !== (ep.adapter ?? ''))
  );

  const statusChip = (result: HealthCheckResult) => {
    if (result.status === "checking") {
      return <CircularProgress size={18} />;
    }
    return (
      <Chip
        label={result.status === "up" ? "Up" : "Down"}
        size="small"
        sx={{
          fontWeight: 700,
          bgcolor: result.status === "up" ? "#D1FAE5" : "#FEE2E2",
          color: result.status === "up" ? "#065F46" : "#991B1B",
          border: 1,
          borderColor: result.status === "up" ? "#A7F3D0" : "#FECACA",
        }}
      />
    );
  };

  return (
    <Box>
      {/* Header row */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
        ml={{ xs: 0, sm: 3 }}
        gap={2}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ color: "gold.main", textShadow: shadows.text }}
          >
            API Endpoints
          </Typography>
          <Chip
            label={isServerMode ? `Server (${import.meta.env.VITE_BACKEND_URL})` : "Environment Variables"}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: isServerMode ? "#DBEAFE" : "#F3F4F6",
              color: isServerMode ? "#1E40AF" : "#374151",
              border: 1,
              borderColor: isServerMode ? "#BFDBFE" : "#D1D5DB",
            }}
          />
        </Box>
        <Box display="flex" gap={1}>
          {canEdit && !editing && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={startEditing}
              disabled={!configReady}
              sx={{
                color: "text.primary",
                bgcolor: "background.paper",
                borderColor: "#CBD5E1",
                textTransform: "uppercase",
                fontWeight: 700,
                "&:hover": { bgcolor: "action.hover", borderColor: "text.secondary" },
              }}
            >
              Edit
            </Button>
          )}
          {editing && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CancelIcon />}
                onClick={cancelEditing}
                disabled={saving}
                sx={{
                  color: "text.primary",
                  bgcolor: "background.paper",
                  borderColor: "#CBD5E1",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  "&:hover": { bgcolor: "action.hover", borderColor: "text.secondary" },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving || !hasChanges}
                sx={{
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Save
              </Button>
            </>
          )}
          {!editing && (
            <Button
              variant="outlined"
              size="small"
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading || !configReady}
              sx={{
                color: "text.primary",
                bgcolor: "background.paper",
                borderColor: "#CBD5E1",
                textTransform: "uppercase",
                fontWeight: 700,
                "&:hover": { bgcolor: "action.hover", borderColor: "text.secondary" },
              }}
            >
              Refresh
            </Button>
          )}
        </Box>
      </Box>

      {saveError && (
        <Typography variant="body2" sx={{ color: "error.main", ml: { xs: 0, sm: 3 }, mb: 2 }}>
          {saveError}
        </Typography>
      )}

      {loading && !results.length && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={24} />
        </Box>
      )}

      {(results.length > 0 || editing) && (
        <TableContainer
          component={Paper}
          sx={{
            ml: { xs: 0, sm: 2 },
            borderRadius: 3,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            backdropFilter: "blur(6px)",
            boxShadow: shadows.lg,
          }}
        >
          <Box sx={{ p: 2 }}>
            <Table>
              <TableHead
                sx={{
                  "& .MuiTableCell-head": {
                    bgcolor: "background.paper",
                    color: "text.primary",
                    fontWeight: 700,
                    borderBottom: 1,
                    borderColor: "divider",
                  },
                }}
              >
                <TableRow>
                  <TableCell>Endpoint</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>Adapter</TableCell>
                  {!editing && <TableCell align="center">Status</TableCell>}
                  {!editing && <TableCell align="right">Latency</TableCell>}
                  {!editing && <TableCell align="right">Last Checked</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {endpoints.map((ep) => {
                  const result = results.find((r) => r.key === ep.key);
                  const adapterOptions = availableAdapters[ep.key] ?? [];
                  return (
                    <TableRow
                      key={ep.key}
                      sx={{
                        "&:hover": { backgroundColor: "action.hover" },
                        "& .MuiTableCell-root": {
                          borderBottom: 1,
                          borderColor: "divider",
                        },
                      }}
                    >
                      <TableCell>
                        <Typography fontWeight={800} sx={{ color: "text.primary" }}>
                          {ep.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {editing ? (
                          <TextField
                            value={editedUrls[ep.key] ?? ep.url}
                            onChange={(e) =>
                              setEditedUrls((prev) => ({ ...prev, [ep.key]: e.target.value }))
                            }
                            size="small"
                            fullWidth
                            variant="outlined"
                            sx={{ minWidth: 300 }}
                          />
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.secondary",
                              maxWidth: 300,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {ep.url}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {editing && adapterOptions.length > 0 ? (
                          <FormControl size="small" sx={{ minWidth: 160 }}>
                            <Select
                              value={editedAdapters[ep.key] ?? ep.adapter ?? ''}
                              onChange={(e) =>
                                setEditedAdapters((prev) => ({ ...prev, [ep.key]: e.target.value }))
                              }
                            >
                              {adapterOptions.map((opt) => (
                                <MenuItem key={opt.key} value={opt.key}>
                                  {opt.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <Chip
                            label={ep.adapter ?? "default"}
                            size="small"
                            clickable={!!ep.adapter}
                            onClick={() => {
                              if (!ep.adapter) return;
                              const opts = availableAdapters[ep.key] ?? [];
                              const match = opts.find(o => o.key === ep.adapter);
                              if (match?.schema) {
                                setSchemaDialog({ name: match.name, schema: match.schema });
                              }
                            }}
                            sx={{
                              fontWeight: 600,
                              fontFamily: "monospace",
                              bgcolor: "#F3F4F6",
                              color: "#374151",
                              border: 1,
                              borderColor: "#D1D5DB",
                              cursor: ep.adapter ? "pointer" : "default",
                            }}
                          />
                        )}
                      </TableCell>
                      {!editing && (
                        <TableCell align="center">
                          {result ? statusChip(result) : "\u2014"}
                        </TableCell>
                      )}
                      {!editing && (
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            {result?.latencyMs != null ? `${result.latencyMs}ms` : "\u2014"}
                          </Typography>
                        </TableCell>
                      )}
                      {!editing && (
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            {result?.checkedAt
                              ? new Date(result.checkedAt).toLocaleTimeString()
                              : "\u2014"}
                          </Typography>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </TableContainer>
      )}

      {/* Error details */}
      {!editing && results.some((r) => r.error && r.status === "down") && (
        <Paper
          sx={{
            mt: 2,
            ml: { xs: 0, sm: 2 },
            p: 2,
            borderRadius: 2,
            bgcolor: "#FEF2F2",
            border: 1,
            borderColor: "#FECACA",
          }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{ color: "#991B1B", mb: 1 }}
          >
            Errors
          </Typography>
          {results
            .filter((r) => r.error && r.status === "down")
            .map((r) => (
              <Typography
                key={r.key}
                variant="body2"
                sx={{ color: "#991B1B", mb: 0.5 }}
              >
                <strong>{r.name}</strong> — {r.error}
              </Typography>
            ))}
        </Paper>
      )}

      {/* Adapter schema preview dialog */}
      <Dialog
        open={!!schemaDialog}
        onClose={() => setSchemaDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        {schemaDialog && (
          <>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography fontWeight={700}>{schemaDialog.name}</Typography>
              <IconButton size="small" onClick={() => setSchemaDialog(null)}>
                <CancelIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: "text.secondary" }}>
                Request
              </Typography>
              <Paper sx={{ p: 2, mb: 2, bgcolor: "#F8FAFC", fontFamily: "monospace", fontSize: "0.85rem", overflow: "auto" }}>
                <pre style={{ margin: 0 }}>{JSON.stringify(schemaDialog.schema.request, null, 2)}</pre>
              </Paper>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: "text.secondary" }}>
                Response
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "#F8FAFC", fontFamily: "monospace", fontSize: "0.85rem", overflow: "auto" }}>
                <pre style={{ margin: 0 }}>{JSON.stringify(schemaDialog.schema.response, null, 2)}</pre>
              </Paper>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ConfigPanel;
