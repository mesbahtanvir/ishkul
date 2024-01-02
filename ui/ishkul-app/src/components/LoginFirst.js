import React from "react";
import { Container, Typography } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { StyledBox } from "./ProfileComponents";

const LoginFirst = () => {
  return (
    <Container maxWidth="sm" style={{ textAlign: "center", marginTop: "20%" }}>
      <CssBaseline />
      <StyledBox>
        <Typography variant="overline" gutterBottom>
          Please log in
        </Typography>
        <Typography variant="caption" gutterBottom>
          To get the best expperience please log in first
        </Typography>
      </StyledBox>
    </Container>
  );
};

export default LoginFirst;
