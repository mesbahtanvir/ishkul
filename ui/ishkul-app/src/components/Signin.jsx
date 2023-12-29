import * as React from "react";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import {
  StyledBox,
  SignInHeader,
  SignInEmailField,
  SignInPasswordField,
  RememberMe,
  SignInSubmitButton,
  PasswordForgetGrid,
  CopyWriteUnderInput,
} from "./ProfileComponents";

export default function SignIn({ appTheme }) {
  const { signIn } = useAuth();
  let navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    console.log({
      email: data.get("email"),
      password: data.get("password"),
    });
    signIn();
    navigate("/");
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <StyledBox>
        <SignInHeader />
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <SignInEmailField />
          <SignInPasswordField />
          <RememberMe />
          <SignInSubmitButton />
          <PasswordForgetGrid />
        </Box>
      </StyledBox>
      <CopyWriteUnderInput />
    </Container>
  );
}
