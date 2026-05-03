import React from "react";
import {
  TableCell,
  TableRow,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Chip,
  CircularProgress,
} from "@mui/material";
import type { ApiEndpointConfig } from "../../../core/interfaces/ConfigService";
import type { HealthCheckResult } from "../../../infrastructure/services/ApiHealthService";
import type { AdapterOption, SchemaDialogState } from "./types";

/** Props: `editedUrl`/`editedAdapter` are unsaved drafts owned by the parent. */
interface EndpointRowProps {
  /** The endpoint to render . */
  endpoint: ApiEndpointConfig;
  /** Latest health-check result, or undefined if no check has run yet. */
  result: HealthCheckResult | undefined;
  /** True when the row should render inputs instead of read-only cells. */
  editing: boolean;
  /** Draft URL for this endpoint, or undefined if untouched. */
  editedUrl: string | undefined;
  /** Draft adapter for this endpoint, or undefined if untouched. */
  editedAdapter: string | undefined;
  /** Adapter options the user can pick from in edit mode. */
  adapterOptions: AdapterOption[];
  /** Called when the user edits the URL field. */
  onUrlChange: (key: string, url: string) => void;
  /** Called when the user picks a different adapter. */
  onAdapterChange: (key: string, adapter: string) => void;
  /** Called when the user clicks an adapter chip with a known schema. */
  onShowSchema: (dialog: SchemaDialogState) => void;
}

/** Maps health-check status to a chip or a spinner. */
const StatusChip: React.FC<{ result: HealthCheckResult }> = ({ result }) => {
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

/** Stateless row: read-mode cells or edit-mode inputs depending on `editing`. */
const EndpointRow: React.FC<EndpointRowProps> = ({
  endpoint,
  result,
  editing,
  editedUrl,
  editedAdapter,
  adapterOptions,
  onUrlChange,
  onAdapterChange,
  onShowSchema,
}) => {
  return (
    <TableRow
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
          {endpoint.name}
        </Typography>
      </TableCell>
      <TableCell>
        {editing ? (
          <TextField
            value={editedUrl ?? endpoint.url}
            onChange={(e) => onUrlChange(endpoint.key, e.target.value)}
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
            {endpoint.url}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        {editing && adapterOptions.length > 0 ? (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={editedAdapter ?? endpoint.adapter ?? ''}
              onChange={(e) => onAdapterChange(endpoint.key, e.target.value)}
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
            label={endpoint.adapter ?? "default"}
            size="small"
            clickable={!!endpoint.adapter}
            onClick={() => {
              if (!endpoint.adapter) return;
              const match = adapterOptions.find((o) => o.key === endpoint.adapter);
              if (match?.schema) {
                onShowSchema({ name: match.name, schema: match.schema });
              }
            }}
            sx={{
              fontWeight: 600,
              fontFamily: "monospace",
              bgcolor: "#F3F4F6",
              color: "#374151",
              border: 1,
              borderColor: "#D1D5DB",
              cursor: endpoint.adapter ? "pointer" : "default",
            }}
          />
        )}
      </TableCell>
      {!editing && (
        <TableCell align="center">
          {result ? <StatusChip result={result} /> : "—"}
        </TableCell>
      )}
      {!editing && (
        <TableCell align="right">
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {result?.latencyMs != null ? `${result.latencyMs}ms` : "—"}
          </Typography>
        </TableCell>
      )}
      {!editing && (
        <TableCell align="right">
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {result?.checkedAt
              ? new Date(result.checkedAt).toLocaleTimeString()
              : "—"}
          </Typography>
        </TableCell>
      )}
    </TableRow>
  );
};

export default EndpointRow;
