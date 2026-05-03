import React from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { shadows } from "../../shared/theme";
import { useManageWorkspaces } from "./manage-workspaces/useManageWorkspaces";
import WorkspaceRow from "./manage-workspaces/WorkspaceRow";
import ExportWorkspaceDialog from "./manage-workspaces/ExportWorkspaceDialog";
import DeleteWorkspaceDialog from "./manage-workspaces/DeleteWorkspaceDialog";

/** Renders the workspace management page with rename, delete, and export actions */
const ManageWorkspacesPage: React.FC = () => {
  const { workspaces, open, rename, deletion, exporting } = useManageWorkspaces();

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 4 },
        py: 3,
        width: "100%",
        height: "100%",
        color: "text.primary",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <Typography
        variant="h5"
        fontWeight={900}
        mb={2}
        ml={{ xs: 0, sm: 3 }}
        sx={{
          color: "gold.main",
          textTransform: "uppercase",
          letterSpacing: 1,
          textShadow: shadows.text,
        }}
      >
        Manage Workspaces
      </Typography>

      <TableContainer
        component={Paper}
        sx={{
          maxHeight: "85vh",
          overflowX: "auto",
          overflowY: "hidden",
          ml: { xs: 0, sm: 2 },
          borderRadius: 3,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          backdropFilter: "blur(6px)",
          boxShadow: shadows.lg,
        }}
      >
        <Box
          sx={{
            maxHeight: "85vh",
            overflowY: "auto",
            overflowX: "auto",
            p: 2,
            "&::-webkit-scrollbar-thumb": {
              background: "#CBD5E1",
              borderRadius: 8,
            },
          }}
        >
          <Table stickyHeader>
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
                <TableCell>Name</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {workspaces.map((ws) => (
                <WorkspaceRow
                  key={ws.id}
                  workspace={ws}
                  isEditing={rename.editingId === ws.id}
                  draftName={rename.draftName}
                  isDuplicate={rename.isRenameDuplicate(ws.id, rename.draftName)}
                  onOpen={open}
                  onStartEdit={rename.startEdit}
                  onCancelEdit={rename.cancelEdit}
                  onSaveEdit={rename.saveEdit}
                  onDraftChange={rename.setDraftName}
                  onExport={exporting.openExport}
                  onDelete={deletion.openDelete}
                />
              ))}
            </TableBody>
          </Table>
        </Box>
      </TableContainer>

      <ExportWorkspaceDialog
        open={exporting.open}
        workspace={exporting.target}
        onClose={exporting.closeExport}
        onExport={exporting.exportAs}
      />

      <DeleteWorkspaceDialog
        open={deletion.open}
        target={deletion.target}
        onClose={deletion.closeDelete}
        onConfirm={deletion.confirmDelete}
      />
    </Box>
  );
};

export default ManageWorkspacesPage;
