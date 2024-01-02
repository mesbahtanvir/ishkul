import * as React from "react";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import { StyledBox } from "./ProfileComponents";
import { useAuth } from "./AuthContext";
import LoginFirst from "./LoginFirst";
import UploadDoc from "./UploadDoc";

export default function Contribute() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) {
    return <LoginFirst />;
  }

  return (
    <Container component="main" maxWidth="lg">
      <CssBaseline />
      <StyledBox>
        <UploadDoc />
      </StyledBox>
    </Container>
  );
}
