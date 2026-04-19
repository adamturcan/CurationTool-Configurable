import React, { useState } from "react";
import {
  Box,
  Fab,
  Tooltip,
  Typography,
  Zoom,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import AddIcon from "@mui/icons-material/Add";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { shadows, sidebarColors } from "../../../shared/theme";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useNavigate, useLocation } from "react-router-dom";
import type { WorkspaceMetadata } from "../../../core/entities/Workspace";

interface Props {
  open: boolean;
  onToggle: () => void;
  onLogout: () => void;
  workspaces: WorkspaceMetadata[];
}

/** Renders the fixed sidebar with workspace bubbles, navigation, and account actions */
const BubbleSidebar: React.FC<Props> = ({
  workspaces,
  open,
  onToggle,
  onLogout,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [mobileOpen, setMobileOpen] = useState(false);

  const isSelected = (path: string) => location.pathname === path;

  const isExpanded = !isMobile && open;

  const showBubbles = isMobile ? mobileOpen : true;

  const isOpen = isMobile ? mobileOpen : open;

  const themeAccent = sidebarColors.accent;
  const bgDark = sidebarColors.bg;

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
    const accent = color || themeAccent;
    const bg = selected ? accent : bgDark;
    const fg = selected ? bgDark : accent;

    const truncatedLabel =
      label.length > 16 ? `${label.slice(0, 15)}…` : label;

    const content = (
      <Fab
        aria-label={ariaLabel || label}
        onClick={onClick}
        disableRipple
        sx={{
          bgcolor: bg,
          color: fg,
          "&:hover": { bgcolor: accent, color: bgDark },
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: shadows.sm,
          display: "flex",
          alignItems: "center",
          gap: 0,
          width: isExpanded ? 200 : 56,
          height: 56,
          minHeight: 56,
          borderRadius: isExpanded ? "28px" : "50%",
          transition: "all 0.25s ease",
          justifyContent: isExpanded ? "space-between" : "center",
          px: isExpanded ? 2 : 0,
          pl: isExpanded ? 2.5 : 0,
          outline: "none",
          "&:focus-visible": {
            boxShadow:
              "0 0 0 3px rgba(160,184,221,0.65), 0 4px 10px rgba(12,24,38,0.18)",
          },
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* Label (only shown when expanded) */}
        {isExpanded && (
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{
              textTransform: "uppercase",
              letterSpacing: 0.4,
              fontSize: "0.78rem",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              color: "inherit",
            }}
          >
            {truncatedLabel}
          </Typography>
        )}

        {/* Icon (always shown) */}
        <Box
          component="span"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            ml: isExpanded ? 1 : 0,
            "& svg": { fontSize: "1.45rem" },
          }}
        >
          {icon}
        </Box>
      </Fab>
    );

    return isExpanded ? (
      content
    ) : (
      <Tooltip title={label} placement="right">
        <span style={{ display: "inline-flex", overflow: "visible" }}>{content}</span>
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
        {/* Toggle expand/collapse button */}
        <Bubble
          label={isOpen ? "Collapse" : "Expand"}
          icon={isOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          onClick={() => (isMobile ? setMobileOpen(!mobileOpen) : onToggle())}
          color={themeAccent}
          ariaLabel="Toggle sidebar"
        />

        {/* Show workspace bubbles only when open (mobile) or always (desktop) */}
        {showBubbles && (
          <>
            {/* First 3 workspaces with zoom-in animation */}
            {workspaces.slice(0, 3).map((ws) => (
              <Zoom in key={ws.id} unmountOnExit>
                <Box>
                  <Bubble
                    label={ws.name}
                    icon={<FolderOpenIcon />}
                    onClick={() => navigate(`/workspace/${ws.id}`)}
                    selected={isSelected(`/workspace/${ws.id}`)}
                    color={themeAccent}
                    ariaLabel={`Open workspace ${ws.name}`}
                  />
                </Box>
              </Zoom>
            ))}

            {/* Add new workspace button */}
            <Bubble
              label="New Workspace"
              icon={<AddIcon />}
              onClick={() => {
                navigate(`/workspace/new`);
              }}
              selected={isSelected("/workspace/new")}
              color={themeAccent}
              ariaLabel="Create new workspace"
            />
          </>
        )}
      </Box>

      {showBubbles && (
        <Box display="flex" flexDirection="column" gap={2}>
          {/* Admin panel */}
          <Bubble
            label="Admin"
            icon={<AdminPanelSettingsIcon />}
            onClick={() => navigate("/admin")}
            selected={isSelected("/admin")}
            color={sidebarColors.admin}
            ariaLabel="Admin panel"
          />

          {/* Account management */}
          <Bubble
            label="Manage Account"
            icon={<AccountCircleIcon />}
            onClick={() => navigate("/manage-account")}
            selected={isSelected("/manage-account")}
            color={sidebarColors.account}
            ariaLabel="Manage account"
          />

          {/* Logout */}
          <Bubble
            label="Logout"
            icon={<LogoutIcon />}
            onClick={onLogout}
            color={sidebarColors.account}
            ariaLabel="Logout"
          />
        </Box>
      )}
    </Box>
  );
};

export default BubbleSidebar;
