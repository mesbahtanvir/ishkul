import React from "react";
import { Container, Typography } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { StyledBox } from "./ProfileComponents";

const ComingSoon = () => {
  return (
    <Container maxWidth="sm" style={{ textAlign: "center", marginTop: "20%" }}>
      <CssBaseline />
      <StyledBox>
        <Typography variant="overline" gutterBottom>
          Coming Soon
        </Typography>
        <Typography variant="caption" gutterBottom>
          We are working hard to launch our new feature. Stay tuned!
        </Typography>
      </StyledBox>
    </Container>
  );
};

export default ComingSoon;
