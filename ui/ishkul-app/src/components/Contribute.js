import * as React from "react";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import { StyledBox } from "./ProfileComponents";
import InputFileUpload from "./Fileupload";

export default function Contribute() {
  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <StyledBox>
        <InputFileUpload />
      </StyledBox>
    </Container>
  );
}
