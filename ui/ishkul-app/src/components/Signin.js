import { Alert, Snackbar } from "@mui/material";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { postLoginUser } from "../service/apiClient";
import { useAuth } from "./AuthContext";
import {
  CopyWriteUnderInput,
  PasswordForgetGrid,
  RememberMe,
  SignInEmailField,
  SignInHeader,
  SignInPasswordField,
  SignInSubmitButton,
  StyledBox,
} from "./ProfileComponents";

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
        resp.data.first_name,
        resp.data.last_name,
        resp.data.email,
        resp.data.token
      );
    } catch (error) {
      handleError(error.message);
      console.log(error);
      return;
    }
    navigate("/my_account");
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
