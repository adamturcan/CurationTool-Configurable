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
import { shadows } from "../../../shared/theme";
import SlideTransition from "../../components/shared/SlideTransition";

interface Props {
  open: boolean;
  target: { id: string; name: string } | null;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirms permanent deletion of a workspace. */
const DeleteWorkspaceDialog: React.FC<Props> = ({ open, target, onClose, onConfirm }) => (
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
        background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.9) 100%)",
        backdropFilter: "blur(6px)",
        boxShadow: shadows.lg,
      },
    }}
  >
    <DialogTitle sx={{ color: "text.primary", fontWeight: 900 }}>
      Delete workspace?
    </DialogTitle>
    <DialogContent sx={{ color: "text.secondary" }}>
      {target ? (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="body1" sx={{ mb: 0.5 }}>You're about to delete:</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
            {target.name}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>ID: {target.id}</Typography>
          <Typography variant="body2" sx={{ mt: 1.5 }}>
            This action can't be undone.
          </Typography>
        </Box>
      ) : null}
    </DialogContent>
    <DialogActions sx={{ p: 2.25 }}>
      <Button
        onClick={onClose}
        variant="outlined"
        sx={{
          color: "text.primary",
          borderColor: "#CBD5E1",
          textTransform: "uppercase",
          fontWeight: 800,
          "&:hover": { bgcolor: "background.paper", borderColor: "text.secondary" },
        }}
      >
        Cancel
      </Button>
      <Button
        onClick={onConfirm}
        variant="contained"
        sx={{
          textTransform: "uppercase",
          fontWeight: 900,
          bgcolor: "error.main",
          "&:hover": { bgcolor: "error.dark" },
        }}
      >
        Delete
      </Button>
    </DialogActions>
  </Dialog>
);

export default DeleteWorkspaceDialog;
