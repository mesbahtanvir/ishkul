import * as React from "react";
import { useState } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { Snackbar, Alert } from "@mui/material";

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
import { postLoginUser } from "./../service/examPaperService";

export default function SignIn({ appTheme }) {
  const { storeSignedInData } = useAuth();
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  let navigate = useNavigate();

  const handleError = (message) => {
    setIsError(true);
    setErrorMessage(message);
  };
  // Function to close the Snackbar
  const handleClose = () => {
    setIsError(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const resp = await postLoginUser(data.get("email"), data.get("password"));
      storeSignedInData(
        resp.first_name,
        resp.last_name,
        resp.email,
        resp.token
      );
    } catch (error) {
      handleError("Login failed. Please try again.");
      console.log(error);
      return;
    }
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
      <Snackbar open={isError} autoHideDuration={6000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
