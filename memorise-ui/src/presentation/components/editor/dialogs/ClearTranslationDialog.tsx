import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";

interface Props {
  open: boolean;
  language: string;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirms clearing the active translation for a single segment. */
const ClearTranslationDialog: React.FC<Props> = ({ open, language, onClose, onConfirm }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Clear Segment Translation</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Are you sure you want to delete the {language.toUpperCase()} translation for this specific segment?
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={onConfirm} color="error" variant="contained">Clear</Button>
    </DialogActions>
  </Dialog>
);

export default ClearTranslationDialog;
