import React, { useState } from "react";
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
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import CancelIcon from "@mui/icons-material/Close";
import { shadows } from "../../../shared/theme";
import EndpointRow from "./EndpointRow";
import AdapterSchemaDialog from "./AdapterSchemaDialog";
import { useEndpointConfig } from "./useEndpointConfig";
import type { SchemaDialogState } from "./types";

const outlinedButtonSx = {
  color: "text.primary",
  bgcolor: "background.paper",
  borderColor: "#CBD5E1",
  textTransform: "uppercase",
  fontWeight: 700,
  "&:hover": { bgcolor: "action.hover", borderColor: "text.secondary" },
} as const;

/**
 * Unified admin panel: shows config source, resolved endpoints, health status, and allows editing endpoint URLs and adapters in server mode.
 */
const ConfigPanel: React.FC = () => {
  const {
    endpoints,
    results,
    loading,
    configReady,
    availableAdapters,
    isServerMode,
    canEdit,
    refresh,
    editing,
    editedUrls,
    editedAdapters,
    saving,
    saveError,
    hasChanges,
    startEditing,
    cancelEditing,
    save,
    setEditedUrl,
    setEditedAdapter,
  } = useEndpointConfig();

  const [schemaDialog, setSchemaDialog] = useState<SchemaDialogState | null>(null);

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
              sx={outlinedButtonSx}
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
                sx={outlinedButtonSx}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                onClick={save}
                disabled={saving || !hasChanges}
                sx={{ textTransform: "uppercase", fontWeight: 700 }}
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
              onClick={refresh}
              disabled={loading || !configReady}
              sx={outlinedButtonSx}
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
                {endpoints.map((ep) => (
                  <EndpointRow
                    key={ep.key}
                    endpoint={ep}
                    result={results.find((r) => r.key === ep.key)}
                    editing={editing}
                    editedUrl={editedUrls[ep.key]}
                    editedAdapter={editedAdapters[ep.key]}
                    adapterOptions={availableAdapters[ep.key] ?? []}
                    onUrlChange={setEditedUrl}
                    onAdapterChange={setEditedAdapter}
                    onShowSchema={setSchemaDialog}
                  />
                ))}
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
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#991B1B", mb: 1 }}>
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
                <strong>{r.name}</strong> - {r.error}
              </Typography>
            ))}
        </Paper>
      )}

      <AdapterSchemaDialog dialog={schemaDialog} onClose={() => setSchemaDialog(null)} />
    </Box>
  );
};

export default ConfigPanel;
