/**
 * NotificationSnackbar - Reusable snackbar component for showing notifications
 *
 * Dismissal modes:
 *  - default:    auto-hides after 2.2s with countdown bar
 *  - persistent: auto-hides after a longer text-scaled duration with countdown bar
 *  - error:      stays until manually dismissed (no countdown bar)
 *  - loading:    stays until the next notice replaces it (indeterminate bar)
 *
 * When `retryAction` is set, a Retry button appears alongside the close button.
 */

import React, { useEffect, useState, useRef } from "react";
import { Snackbar, Alert, Box, Button, IconButton, LinearProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReplayIcon from "@mui/icons-material/Replay";
import type { NoticeOptions, NoticeTone } from "../../../types";

const ANCHOR_ORIGIN = { vertical: "bottom" as const, horizontal: "center" as const };
const DEFAULT_DURATION_MS = 2200;
const MS_PER_WORD = 200;
const MIN_PERSISTENT_MS = 5000;
const COUNTDOWN_INTERVAL_MS = 30;
const ALERT_BG_COLOR = "#21426C";
const ALERT_BG_COLOR_INFO = "#0E4AA1";

function computeDuration(message: string | null, persistent: boolean): number {
  if (!persistent) return DEFAULT_DURATION_MS;
  if (!message) return MIN_PERSISTENT_MS;
  const wordCount = message.split(/\s+/).length;
  return Math.max(MIN_PERSISTENT_MS, wordCount * MS_PER_WORD);
}

function useCountdown(active: boolean, durationMs: number | null) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!active || durationMs === null || durationMs <= 0) {
      setProgress(100);
      return;
    }

    startRef.current = performance.now();
    setProgress(100);

    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        frameRef.current = window.setTimeout(tick, COUNTDOWN_INTERVAL_MS);
      }
    };

    frameRef.current = window.setTimeout(tick, COUNTDOWN_INTERVAL_MS);

    return () => {
      window.clearTimeout(frameRef.current);
    };
  }, [active, durationMs]);

  return progress;
}

export interface NotificationSnackbarProps extends NoticeOptions {
  message: string | null;
  onClose: () => void;
}

export const NotificationSnackbar: React.FC<NotificationSnackbarProps> = ({
  message,
  onClose,
  tone = "default",
  persistent = false,
  loading = false,
  retryAction,
}) => {
  const resolvedTone: NoticeTone = tone ?? "default";
  const severity = resolvedTone === "default" ? "info" : resolvedTone;
  const isError = resolvedTone === "error";
  const backgroundColor = resolvedTone === "info" || resolvedTone === "default"
    ? ALERT_BG_COLOR_INFO
    : resolvedTone === "success"
      ? "#2E7D32"
      : resolvedTone === "warning"
        ? "#ED6C02"
        : isError
          ? "#D32F2F"
          : ALERT_BG_COLOR;

  // Errors stay until dismissed. Loading stays until replaced. Others auto-dismiss.
  const shouldAutoDismiss = !loading && !isError;
  const durationMs = shouldAutoDismiss ? computeDuration(message, persistent) : null;
  const showCountdown = shouldAutoDismiss && !loading;

  const isOpen = !!message;
  const progress = useCountdown(isOpen, durationMs);

  const handleClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if ((isError || persistent || loading) && reason === "clickaway") {
      return;
    }
    if (loading && reason === "timeout") {
      return;
    }
    onClose();
  };

  const handleRetry = () => {
    onClose();
    retryAction?.();
  };

  return (
    <Snackbar
      open={isOpen}
      autoHideDuration={durationMs ?? undefined}
      onClose={handleClose}
      anchorOrigin={ANCHOR_ORIGIN}
    >
      <Box sx={{ width: "100%" }}>
        <Alert
          onClose={loading || retryAction ? undefined : handleClose}
          severity={severity}
          variant="filled"
          sx={{ bgcolor: backgroundColor, borderRadius: "6px", pb: showCountdown || loading ? 1.5 : undefined }}
          action={retryAction ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Button
                color="inherit"
                size="small"
                startIcon={<ReplayIcon fontSize="small" />}
                onClick={handleRetry}
                sx={{ fontWeight: 600, textTransform: "none" }}
              >
                Retry
              </Button>
              <IconButton color="inherit" size="small" onClick={handleClose}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : undefined}
        >
          {message}
        </Alert>
        {loading && (
          <LinearProgress
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              borderRadius: "0 0 6px 6px",
              bgcolor: "rgba(0,0,0,0.25)",
              "& .MuiLinearProgress-bar": { bgcolor: "rgba(255,255,255,0.7)" },
            }}
          />
        )}
        {showCountdown && (
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              borderRadius: "0 0 6px 6px",
              overflow: "hidden",
              bgcolor: "rgba(0,0,0,0.25)",
            }}
          >
            <Box
              sx={{
                height: "100%",
                width: `${progress}%`,
                bgcolor: "rgba(255,255,255,0.7)",
                transition: progress === 100 ? "none" : `width ${COUNTDOWN_INTERVAL_MS}ms linear`,
              }}
            />
          </Box>
        )}
      </Box>
    </Snackbar>
  );
};
