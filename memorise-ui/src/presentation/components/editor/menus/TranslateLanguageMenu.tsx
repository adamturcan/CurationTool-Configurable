import React, { useMemo, useState } from "react";
import { Box, CircularProgress, Menu, MenuItem, TextField } from "@mui/material";
import { sx as sxUtil } from "../../../../shared/styles";
import type { LanguageOption } from "../../../hooks";

interface Props {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onPick: (code: string) => void;
  /** Languages already translated for the segment — excluded from the list. */
  availableLangs: string[];
  languageOptions: LanguageOption[];
  isLoading: boolean;
}

/** Searchable language picker for adding a translation to a segment. */
const TranslateLanguageMenu: React.FC<Props> = ({ anchorEl, onClose, onPick, availableLangs, languageOptions, isLoading }) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = languageOptions.filter((o) => !availableLangs.includes(o.code));
    if (!q) return base;
    return base.filter(({ code, label }) => code.toLowerCase().includes(q) || label.toLowerCase().includes(q));
  }, [languageOptions, query, availableLangs]);

  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose} PaperProps={{ sx: { maxHeight: 280, minWidth: 260 } }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #eee' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search language..."
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          variant="standard"
          InputProps={{ disableUnderline: true }}
        />
      </Box>
      <Box sx={{ px: 1, pb: 1, maxHeight: 220, overflowY: "auto" }}>
        {isLoading ? (
          <MenuItem disabled><CircularProgress size={16} sx={{ mr: 1 }} /> Loading…</MenuItem>
        ) : filtered.length > 0 ? (
          filtered.map(({ code, label }) => (
            <MenuItem
              key={code}
              onClick={(e) => { e.stopPropagation(); onPick(code); }}
            >
              <Box sx={{ ...sxUtil.flexColumn }}>
                <span style={{ textTransform: "uppercase", fontWeight: 600 }}>{code}</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>{label}</span>
              </Box>
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No matches</MenuItem>
        )}
      </Box>
    </Menu>
  );
};

export default TranslateLanguageMenu;
