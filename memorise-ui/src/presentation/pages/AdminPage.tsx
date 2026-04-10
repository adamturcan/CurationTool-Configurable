import React from "react";
import { Box, Typography } from "@mui/material";
import { shadows } from "../../shared/theme";
import ConfigPanel from "../components/admin/ConfigPanel";

/** Renders the admin dashboard with configuration and API health monitoring */
const AdminPage: React.FC = () => {
  return (
    <Box
      sx={{
        px: { xs: 2, sm: 4 },
        py: 3,
        pb: 6,
        width: "100%",
        height: "100%",
        overflowY: "auto",
        color: "text.primary",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <Typography
        variant="h5"
        fontWeight={900}
        mb={2}
        ml={{ xs: 0, sm: 3 }}
        sx={{
          color: "gold.main",
          textTransform: "uppercase",
          letterSpacing: 1,
          textShadow: shadows.text,
        }}
      >
        Admin
      </Typography>

      <ConfigPanel />
    </Box>
  );
};

export default AdminPage;
