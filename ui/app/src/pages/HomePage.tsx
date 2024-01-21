import React from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import { StyledBox } from "../components/ProfileComponents";

const HomePage: React.FC = () => {
  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <StyledBox>
        <Box></Box>
      </StyledBox>
    </Container>
  );
};

export default HomePage;
