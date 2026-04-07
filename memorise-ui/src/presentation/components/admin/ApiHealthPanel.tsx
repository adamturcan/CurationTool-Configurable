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
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { shadows } from "../../../shared/theme";
import { getConfigService } from "../../../infrastructure/providers/configProvider";
import { getApiHealthService } from "../../../infrastructure/providers/apiHealthProvider";
import type { HealthCheckResult } from "../../../infrastructure/services/ApiHealthService";

/** Displays health status for each configured API endpoint */
const ApiHealthPanel: React.FC = () => {
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runChecks = useCallback(async () => {
    setLoading(true);
    const endpoints = getConfigService().getEndpoints();

    // Set initial "checking" state for all endpoints
    setResults(
      endpoints.map((ep) => ({
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

    const checked = await getApiHealthService().checkAll(endpoints);
    setResults(checked);
    setLoading(false);
  }, []);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

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
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
        ml={{ xs: 0, sm: 3 }}
      >
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={{ color: "gold.main", textShadow: shadows.text }}
        >
          API Endpoints
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={runChecks}
          disabled={loading}
          sx={{
            color: "text.primary",
            bgcolor: "background.paper",
            borderColor: "#CBD5E1",
            textTransform: "uppercase",
            fontWeight: 700,
            "&:hover": {
              bgcolor: "action.hover",
              borderColor: "text.secondary",
            },
          }}
        >
          Refresh
        </Button>
      </Box>

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
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Latency</TableCell>
                <TableCell align="right">Last Checked</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((r) => (
                <TableRow
                  key={r.key}
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
                      {r.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
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
                      {r.url}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{statusChip(r)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {r.latencyMs != null ? `${r.latencyMs}ms` : "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {r.checkedAt
                        ? new Date(r.checkedAt).toLocaleTimeString()
                        : "—"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {results.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", py: 2 }}
                    >
                      No endpoints configured
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </TableContainer>

      {/* Error details */}
      {results.some((r) => r.error && r.status === "down") && (
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

export default ApiHealthPanel;
