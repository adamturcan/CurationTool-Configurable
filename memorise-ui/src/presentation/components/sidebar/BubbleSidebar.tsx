import React from "react";
import {
  Box,
  Fab,
  Tooltip,
  Zoom,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import AddIcon from "@mui/icons-material/Add";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import TuneIcon from "@mui/icons-material/Tune";
import { shadows, sidebarColors } from "../../../shared/theme";
import { useNavigate, useLocation } from "react-router-dom";
import { useSessionStore, useNotificationStore } from "../../stores";
import type { WorkspaceMetadata } from "../../../core/entities/Workspace";

interface Props {
  onLogout: () => void;
  workspaces: WorkspaceMetadata[];
  onNewWorkspace: () => void;
}

/** Renders the fixed sidebar with workspace bubbles, navigation, and account actions */
const BubbleSidebar: React.FC<Props> = ({
  workspaces,
  onLogout,
  onNewWorkspace,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDirty = useSessionStore((s) => s.isDirty);
  const showGuard = useNotificationStore((s) => s.showUnsavedGuard);

  const isSelected = (path: string) => location.pathname === path;

  const guardedNavigate = (path: string) => {
    if (isSelected(path)) return;
    if (isDirty) { showGuard(() => navigate(path)); return; }
    navigate(path);
  };

  const Bubble = ({
    label,
    icon,
    onClick,
    selected,
    color,
    ariaLabel,
  }: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    selected?: boolean;
    color?: string;
    ariaLabel?: string;
  }) => {
    const accent = color || sidebarColors.accent;
    const bg = selected ? accent : sidebarColors.bg;
    const fg = selected ? sidebarColors.bg : accent;

    return (
      <Tooltip title={label} placement="right">
        <span style={{ display: "inline-flex", overflow: "visible" }}>
          <Fab
            aria-label={ariaLabel || label}
            onClick={onClick}
            disableRipple
            sx={{
              bgcolor: bg,
              color: fg,
              "&:hover": { bgcolor: accent, color: sidebarColors.bg },
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: shadows.sm,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              minHeight: 56,
              borderRadius: "50%",
              outline: "none",
              "&:focus-visible": {
                boxShadow:
                  "0 0 0 3px rgba(160,184,221,0.65), 0 4px 10px rgba(12,24,38,0.18)",
              },
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                "& svg": { fontSize: "1.45rem" },
              }}
            >
              {icon}
            </Box>
          </Fab>
        </span>
      </Tooltip>
    );
  };

  return (
    <Box
      sx={{
        position: "fixed",
        top: 80,
        left: 16,
        padding: 0.5,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "85vh",
        zIndex: 1300,
        overflowY: "auto",
      }}
    >
      <Box display="flex" flexDirection="column" gap={2}>
        {workspaces.slice(0, 3).map((ws) => (
          <Zoom in key={ws.id} unmountOnExit>
            <Box>
              <Bubble
                label={ws.name}
                icon={<FolderOpenIcon />}
                onClick={() => guardedNavigate(`/workspace/${ws.id}`)}
                selected={isSelected(`/workspace/${ws.id}`)}
                ariaLabel={`Open workspace ${ws.name}`}
              />
            </Box>
          </Zoom>
        ))}

        {workspaces.length > 3 && (
          <Zoom in unmountOnExit>
            <Box>
              <Bubble
                label={`${workspaces.length - 3} more - Manage Workspaces`}
                icon={
                  <Box component="span" sx={{ fontSize: "0.95rem", fontWeight: 800, lineHeight: 1 }}>
                    {`+${workspaces.length - 3}`}
                  </Box>
                }
                onClick={() => guardedNavigate("/manage-workspaces")}
                selected={isSelected("/manage-workspaces")}
                ariaLabel={`Show ${workspaces.length - 3} more workspaces`}
              />
            </Box>
          </Zoom>
        )}

        <Bubble
          label="New Workspace"
          icon={<AddIcon />}
          onClick={() => {
            if (isDirty) { showGuard(() => onNewWorkspace()); return; }
            onNewWorkspace();
          }}
          ariaLabel="Create new workspace"
        />
      </Box>

      <Box display="flex" flexDirection="column" gap={2}>
        <Bubble
          label="Services"
          icon={<TuneIcon />}
          onClick={() => guardedNavigate("/services")}
          selected={isSelected("/services")}
          color={sidebarColors.admin}
          ariaLabel="Services panel"
        />

        <Bubble
          label="Manage Account"
          icon={<AccountCircleIcon />}
          onClick={() => guardedNavigate("/manage-account")}
          selected={isSelected("/manage-account")}
          color={sidebarColors.account}
          ariaLabel="Manage account"
        />

        <Bubble
          label="Logout"
          icon={<LogoutIcon />}
          onClick={() => {
            if (isDirty) { showGuard(() => onLogout()); return; }
            onLogout();
          }}
          color={sidebarColors.account}
          ariaLabel="Logout"
        />
      </Box>
    </Box>
  );
};

export default BubbleSidebar;
