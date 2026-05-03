import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import CodeIcon from "@mui/icons-material/Code";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import type { WorkspaceMetadata } from "../../../core/entities/Workspace";
import { shadows } from "../../../shared/theme";
import { sx as sxUtil } from "../../../shared/styles";
import SlideTransition from "../../components/shared/SlideTransition";

interface Props {
  open: boolean;
  workspace: WorkspaceMetadata | null;
  onClose: () => void;
  onExport: (type: "json" | "pdf") => void;
}

/** Format chooser for exporting a workspace as JSON or PDF. */
const ExportWorkspaceDialog: React.FC<Props> = ({ open, workspace, onClose, onExport }) => (
  <Dialog
    open={open}
    TransitionComponent={SlideTransition}
    keepMounted
    onClose={onClose}
    PaperProps={{
      sx: {
        borderRadius: 3,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: shadows.lg,
        maxWidth: "400px",
        width: "100%",
      },
    }}
  >
    <DialogTitle sx={{ color: "text.primary", fontWeight: 900, pb: 1 }}>
      Export Workspace
    </DialogTitle>
    <DialogContent sx={{ px: 3, py: 2 }}>
      {workspace ? (
        <Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3, fontWeight: 500 }}>
            {workspace.name}
          </Typography>
          <Box sx={{ ...sxUtil.flexColumn, gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => onExport("json")}
              startIcon={<CodeIcon />}
              sx={{
                justifyContent: "flex-start",
                color: "text.primary",
                borderColor: "#CBD5E1",
                textTransform: "none",
                fontWeight: 600,
                py: 1.5,
                px: 2,
                borderRadius: 2,
                "&:hover": {
                  backgroundColor: "action.hover",
                  borderColor: "primary.main",
                  color: "primary.main",
                },
              }}
            >
              Export as JSON
            </Button>
            <Button
              variant="outlined"
              onClick={() => onExport("pdf")}
              startIcon={<PictureAsPdfIcon />}
              sx={{
                justifyContent: "flex-start",
                color: "text.primary",
                borderColor: "#CBD5E1",
                textTransform: "none",
                fontWeight: 600,
                py: 1.5,
                px: 2,
                borderRadius: 2,
                "&:hover": {
                  backgroundColor: "action.hover",
                  borderColor: "error.dark",
                  color: "error.dark",
                },
              }}
            >
              Export as PDF
            </Button>
          </Box>
        </Box>
      ) : null}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
      <Button
        onClick={onClose}
        variant="text"
        sx={{
          color: "text.secondary",
          textTransform: "none",
          fontWeight: 600,
          "&:hover": { backgroundColor: "action.hover" },
        }}
      >
        Cancel
      </Button>
    </DialogActions>
  </Dialog>
);

export default ExportWorkspaceDialog;
