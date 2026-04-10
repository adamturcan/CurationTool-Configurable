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
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import CancelIcon from "@mui/icons-material/Close";
import { shadows } from "../../../shared/theme";
import { getConfigService } from "../../../infrastructure/providers/configProvider";
import { getApiHealthService } from "../../../infrastructure/providers/apiHealthProvider";
import type { HealthCheckResult } from "../../../infrastructure/services/ApiHealthService";
import type { ApiEndpointConfig } from "../../../core/interfaces/ConfigService";

/**
 * Unified admin panel: shows config source, resolved endpoints, health status,
 * and allows editing endpoint URLs in server mode.
 */
const ConfigPanel: React.FC = () => {
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [configReady, setConfigReady] = useState(false);
  const [endpoints, setEndpoints] = useState<ApiEndpointConfig[]>([]);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editedUrls, setEditedUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isServerMode = !!import.meta.env.VITE_BACKEND_URL;

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

    const checked = await getApiHealthService().checkAll(eps);
    setResults(checked);
  }, []);

  useEffect(() => {
    let cancelled = false;

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
  }, [runChecks]);

  const handleRefresh = useCallback(async () => {
    await runChecks(endpoints);
  }, [runChecks, endpoints]);

  const startEditing = () => {
    const urlMap: Record<string, string> = {};
    for (const ep of endpoints) {
      urlMap[ep.key] = ep.url;
    }
    setEditedUrls(urlMap);
    setSaveError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditedUrls({});
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    const updated = endpoints.map((ep) => ({
      ...ep,
      url: editedUrls[ep.key] ?? ep.url,
    }));

    try {
      await getConfigService().saveConfig({ endpoints: updated });
      setEndpoints(updated);
      setEditing(false);
      setEditedUrls({});
      await runChecks(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = endpoints.some((ep) => editedUrls[ep.key] !== undefined && editedUrls[ep.key] !== ep.url);

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
          {isServerMode && !editing && (
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
                  {!editing && <TableCell align="center">Status</TableCell>}
                  {!editing && <TableCell align="right">Latency</TableCell>}
                  {!editing && <TableCell align="right">Last Checked</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {endpoints.map((ep) => {
                  const result = results.find((r) => r.key === ep.key);
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
        <Box mt={2} ml={{ xs: 0, sm: 3 }}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{ color: "text.primary", mb: 1 }}
          >
            Errors
          </Typography>
          {results
            .filter((r) => r.error && r.status === "down")
            .map((r) => (
              <Typography
                key={r.key}
                variant="body2"
                sx={{ color: "error.main", mb: 0.5 }}
              >
                {r.name}: {r.error}
              </Typography>
            ))}
        </Box>
      )}
    </Box>
  );
};

export default ConfigPanel;
