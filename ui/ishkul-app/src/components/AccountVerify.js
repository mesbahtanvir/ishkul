import { Snackbar } from "@mui/material";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import * as React from "react";
import { useState } from "react";
import { useAuth } from "./AuthContext";
import {
  CopyWriteUnderInput,
  SignInEmailField,
  StyledBox,
  CodeField,
  SubmitVerificationCode,
  AccountVerifyHeader,
} from "./ProfileComponents";
import { useNavigate } from "react-router-dom";

import { postVerifyAccount } from "../service/apiClient";
import Alert from "./Alert";

export default function AccountVerify() {
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { storeSignedInData } = useAuth();
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
    try {
      const data = new FormData(event.currentTarget);
      const resp = await postVerifyAccount(data.get("email"), data.get("code"));
      storeSignedInData(
        resp.data.first_name,
        resp.data.last_name,
        resp.data.email,
        resp.data.token
      );
    } catch (error) {
      handleError(error.message);
      return;
    }
    navigate("/change_password");
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <StyledBox>
        <AccountVerifyHeader />
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <SignInEmailField />
          <CodeField />
          <SubmitVerificationCode />
        </Box>
      </StyledBox>
      <CopyWriteUnderInput />
      <Snackbar open={isError} autoHideDuration={6000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="error" sx={{ width: "100%" }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
