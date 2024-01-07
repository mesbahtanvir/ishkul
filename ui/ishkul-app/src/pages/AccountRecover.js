import { Snackbar } from "@mui/material";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import * as React from "react";
import { useState } from "react";
import {
  CopyWriteUnderInput,
  SignInEmailField,
  AccountRecoverHeader,
  SendVerificationCode,
  StyledBox,
} from "../components/ProfileComponents";
import AccountVerify from "./AccountVerify";

import { postSendVerificationCode } from "../service/apiClient";
import Alert from "../components/Alert";

export default function AccountRecover() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
      setEmail(data.get("email"));
      await postSendVerificationCode(data.get("email"));
      setIsSubmitted(true);
    } catch (error) {
      handleError(error.message);
      return;
    }
  };

  if (isSubmitted) {
    return <AccountVerify email={email} />; // Render the AccountVerify component
  }

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <StyledBox>
        <AccountRecoverHeader />
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <SignInEmailField />
          <SendVerificationCode />
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
