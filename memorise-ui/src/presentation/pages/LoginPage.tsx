import React, { useMemo, useState } from "react";
import { shadows, loginColors } from "../../shared/theme";
import {
  Box,
  Paper,
  TextField,
  Button,
  InputAdornment,
  Tabs,
  Tab,
  Alert,
} from "@mui/material";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import { useAuthStore } from "../stores/authStore";

type Props = {
  onLogin: (username: string, password?: string) => Promise<void>;
  onRegister?: (username: string, email: string, password: string) => Promise<void>;
};

const COLORS = loginColors;

const inputSx = {
  "& .MuiOutlinedInput-root": {
    color: "#F5F7FA",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 2,
    transition: "box-shadow .2s ease, border-color .2s ease",
    "& fieldset": { borderColor: "rgba(255,255,255,0.18)" },
    "&:hover fieldset": { borderColor: COLORS.accent },
    "&.Mui-focused fieldset": {
      borderColor: COLORS.accent,
      boxShadow: "0 0 0 3px rgba(232,220,176,0.22)",
    },
    "&.Mui-error fieldset": { borderColor: "#FF6B6B" },
  },
  "& .MuiInputBase-input::placeholder": {
    color: "rgba(255,255,255,0.5)",
    opacity: 1,
  },
};

const labelSx = {
  color: "rgba(255,255,255,0.75)",
  "&.Mui-focused": { color: COLORS.accent },
  "&.Mui-error": { color: "#FF9A9A" },
};

const helperSx = {
  mt: 1,
  fontWeight: 600,
  letterSpacing: 0.2,
};

/** Renders the login page with optional registration tab in server mode */
const LoginPage: React.FC<Props> = ({ onLogin, onRegister }) => {
  const isServerMode = useAuthStore((s) => s.isServerMode);
  const authError = useAuthStore((s) => s.error);

  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const trimmedUsername = useMemo(() => username.trim(), [username]);
  const trimmedEmail = useMemo(() => email.trim(), [email]);
  const hasUsernameError = touched && trimmedUsername.length === 0;

  const error = localError ?? authError;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setLocalError(null);
    if (!trimmedUsername) return;

    try {
      setSubmitting(true);
      await onLogin(trimmedUsername, isServerMode ? password : undefined);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setLocalError(null);
    if (!trimmedUsername || !trimmedEmail || !password) return;

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters");
      return;
    }

    try {
      setSubmitting(true);
      await onRegister?.(trimmedUsername, trimmedEmail, password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const clearOnTabChange = (newTab: "login" | "register") => {
    setTab(newTab);
    setTouched(false);
    setLocalError(null);
    useAuthStore.getState().setError(null);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: 2,
        background: COLORS.gradient,
      }}
    >
      <Paper
        sx={{
          width: "100%",
          maxWidth: 560,
          px: { xs: 3, sm: 4 },
          py: { xs: 2, sm: 3 },
          borderRadius: 3,
          backgroundColor: COLORS.cardBg,
          border: "1px solid rgba(255,255,255,0.05)",
          boxShadow: shadows.lg,
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <Box sx={{ display: "flex", justifyContent: "center", m: 0 }}>
          <img
            src={import.meta.env.VITE_APP_LOGO_FULL || import.meta.env.BASE_URL + "memorise-dct.png"}
            alt={import.meta.env.VITE_APP_TITLE || "Memorise data curation tool"}
            style={{
              maxHeight: "20%",
              maxWidth: "50%",
              objectFit: "contain",
              filter: "drop-shadow(0 2px 14px rgba(0,0,0,0.5))",
            }}
          />
        </Box>

        {/* Tabs (server mode only) */}
        {isServerMode && (
          <Tabs
            value={tab}
            onChange={(_, v) => clearOnTabChange(v)}
            centered
            textColor="inherit"
            sx={{
              mb: 2,
              "& .MuiTab-root": {
                color: "rgba(255,255,255,0.6)",
                fontWeight: 700,
                textTransform: "none",
              },
              "& .Mui-selected": { color: COLORS.accent },
              "& .MuiTabs-indicator": { backgroundColor: COLORS.accent },
            }}
          >
            <Tab label="Sign In" value="login" />
            <Tab label="Register" value="register" />
          </Tabs>
        )}

        {/* Error display */}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, textAlign: "left" }}
            onClose={() => { setLocalError(null); useAuthStore.getState().setError(null); }}
          >
            {error}
          </Alert>
        )}

        {/* Login form */}
        {tab === "login" && (
          <Box component="form" onSubmit={handleLoginSubmit} noValidate>
            <TextField
              fullWidth
              label="Username"
              placeholder="your-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setTouched(true)}
              error={hasUsernameError}
              helperText={hasUsernameError ? "Please enter your username." : undefined}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineRoundedIcon sx={{ color: COLORS.accent, opacity: 0.9 }} />
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{ sx: labelSx }}
              FormHelperTextProps={{ sx: helperSx }}
              sx={inputSx}
            />

            {isServerMode && (
              <TextField
                fullWidth
                label="Password"
                type="password"
                placeholder="your-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: COLORS.accent, opacity: 0.9 }} />
                    </InputAdornment>
                  ),
                }}
                InputLabelProps={{ sx: labelSx }}
                FormHelperTextProps={{ sx: helperSx }}
                sx={{ ...inputSx, mt: 2 }}
              />
            )}

            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={!trimmedUsername || submitting || (isServerMode && !password)}
              sx={{
                mt: 2,
                width: "100%",
                py: 1.2,
                fontWeight: 800,
                textTransform: "none",
                borderRadius: 2,
                backgroundColor: COLORS.btnBg,
                color: COLORS.btnText,
                "&:hover": { backgroundColor: COLORS.btnHover },
                "&.Mui-disabled": {
                  backgroundColor: "rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.35)",
                },
                boxShadow: shadows.md,
              }}
            >
              {submitting ? "Signing in\u2026" : "Sign in"}
            </Button>
          </Box>
        )}

        {/* Register form (server mode only) */}
        {tab === "register" && isServerMode && (
          <Box component="form" onSubmit={handleRegisterSubmit} noValidate>
            <TextField
              fullWidth
              label="Username"
              placeholder="your-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setTouched(true)}
              error={hasUsernameError}
              helperText={hasUsernameError ? "Please enter a username." : undefined}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineRoundedIcon sx={{ color: COLORS.accent, opacity: 0.9 }} />
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{ sx: labelSx }}
              FormHelperTextProps={{ sx: helperSx }}
              sx={inputSx}
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon sx={{ color: COLORS.accent, opacity: 0.9 }} />
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{ sx: labelSx }}
              FormHelperTextProps={{ sx: helperSx }}
              sx={{ ...inputSx, mt: 2 }}
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              placeholder="min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: COLORS.accent, opacity: 0.9 }} />
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{ sx: labelSx }}
              FormHelperTextProps={{ sx: helperSx }}
              sx={{ ...inputSx, mt: 2 }}
            />

            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              placeholder="repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={touched && confirmPassword !== "" && password !== confirmPassword}
              helperText={
                touched && confirmPassword !== "" && password !== confirmPassword
                  ? "Passwords do not match"
                  : undefined
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: COLORS.accent, opacity: 0.9 }} />
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{ sx: labelSx }}
              FormHelperTextProps={{ sx: helperSx }}
              sx={{ ...inputSx, mt: 2 }}
            />

            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={
                !trimmedUsername || !trimmedEmail || !password || !confirmPassword || submitting
              }
              sx={{
                mt: 2,
                width: "100%",
                py: 1.2,
                fontWeight: 800,
                textTransform: "none",
                borderRadius: 2,
                backgroundColor: COLORS.btnBg,
                color: COLORS.btnText,
                "&:hover": { backgroundColor: COLORS.btnHover },
                "&.Mui-disabled": {
                  backgroundColor: "rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.35)",
                },
                boxShadow: shadows.md,
              }}
            >
              {submitting ? "Creating account\u2026" : "Create Account"}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default LoginPage;
