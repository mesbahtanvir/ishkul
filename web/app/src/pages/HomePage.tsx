import React from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import HelpIcon from "@mui/icons-material/Help";
import MenuIcon from "@mui/icons-material/Menu";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import { StyledBox } from "../components/ProfileComponents";
import LightModeIcon from "@mui/icons-material/LightMode";

const HomePage: React.FC = () => {
  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <StyledBox>
        {/* Introduction Text */}
        <Typography variant="h6" gutterBottom>
          Welcome to Ishkul!
        </Typography>
        <Typography variant="body1">Here's how to get started:</Typography>

        {/* Step-by-Step Instructions */}
        <Box my={2}>
          <Typography variant="body2">
            1. Use the top left icon{" "}
            <Tooltip title="Navigate through the app">
              <MenuIcon />
            </Tooltip>{" "}
            to explore the app.
          </Typography>
          <Typography variant="body2">
            2. Click the top right icon{" "}
            <Tooltip title="Manage app settings">
              <ManageAccountsIcon />
            </Tooltip>{" "}
            to manage account.
          </Typography>
          <Typography variant="body2">
            3. Click the top right{" "}
            <Tooltip title="Change theme">
              <LightModeIcon />
            </Tooltip>{" "}
            to change theme.
          </Typography>
          {/* Add more steps as needed */}
        </Box>

        {/* Tool Tips Example */}
        <Box display="flex" alignItems="center" my={2}>
          <HelpIcon color="action" />
          <Typography variant="body2" marginLeft={1}>
            Hover over icons for quick tips!
          </Typography>
        </Box>

        {/* Additional Information or Visual Cues */}
        {/* Add any other relevant information or visual guides */}
      </StyledBox>
    </Container>
  );
};

export default HomePage;
