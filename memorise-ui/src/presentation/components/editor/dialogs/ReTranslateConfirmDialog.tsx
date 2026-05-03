import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";

interface Props {
  open: boolean;
  language: string;
  onClose: () => void;
  onConfirm: () => void;
}

/** Warns the user that re-translating will overwrite their manual edits. */
const ReTranslateConfirmDialog: React.FC<Props> = ({ open, language, onClose, onConfirm }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Re-translate Segment</DialogTitle>
    <DialogContent>
      <DialogContentText>
        This will re-translate the segment from the original text and overwrite your manual edits to the {language.toUpperCase()} translation. Continue?
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onClose}>Cancel</Button>
      <Button color="warning" variant="contained" onClick={onConfirm}>Re-translate</Button>
    </DialogActions>
  </Dialog>
);

export default ReTranslateConfirmDialog;
