import React from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import { StyledBox } from "../components/ProfileComponents";
import { Typography } from "@mui/material";

const LoginRequiredPage: React.FC = () => {
  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <StyledBox>
        <Box>
          <Typography> Log in first, to see this page.</Typography>
        </Box>
      </StyledBox>
    </Container>
  );
};

export default LoginRequiredPage;
