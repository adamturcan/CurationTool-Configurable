/** MUI theme configuration - palette loaded from theme.config.json */
import { createTheme, responsiveFontSizes } from "@mui/material";
import config from "../../theme.config.json";

/** Named shadow tokens */
export const shadows = {
  sm: "0 2px 6px rgba(0,0,0,0.08)",
  md: "0 6px 20px rgba(0,0,0,0.12)",
  lg: "0 14px 40px rgba(0,0,0,0.2)",
  text: "0 2px 4px rgba(0,0,0,0.35)",
} as const;

/** Background gradient from theme config */
export const appGradient = config.gradient;

/** Login page colors from theme config */
export const loginColors = config.login;

/** Sidebar bubble colors from theme config */
export const sidebarColors = config.sidebar;

declare module "@mui/material/styles" {
  interface Palette {
    gold: Palette["primary"];
  }
  interface PaletteOptions {
    gold?: PaletteOptions["primary"];
  }
}

let theme = createTheme({
  palette: {
    mode: "light",
    ...config.palette,
  },

  typography: {
    fontFamily: ["DM Sans", "DM Mono", "Jacques Francois", "sans-serif"].join(","),
    h1: { fontSize: "3.5rem", fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: "2.5rem", fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: "2rem", fontWeight: 700, lineHeight: 1.3 },
    body1: { fontSize: "1rem", lineHeight: 1.5 },
    body2: { fontSize: "0.875rem", lineHeight: 1.5 },
  },

  shape: {
    borderRadius: 8,
  },

  transitions: {
    duration: {
      shortest: 150,
      short: 200,
      standard: 250,
      complex: 375,
    },
    easing: {
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
  },
});

theme = responsiveFontSizes(theme);

export default theme;
