import React from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import { StyledBox } from "../components/ProfileComponents";
import { Typography } from "@mui/material";

const NotFoundPage: React.FC = () => {
  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <StyledBox>
        <Box>
          <Typography>Page not found </Typography>
        </Box>
      </StyledBox>
    </Container>
  );
};

export default NotFoundPage;
