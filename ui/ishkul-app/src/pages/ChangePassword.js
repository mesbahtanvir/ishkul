import { Snackbar } from "@mui/material";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import * as React from "react";
import { useState } from "react";
import {
  CopyWriteUnderInput,
  StyledBox,
  SignUpPasswordField,
  ChangePasswordHeader,
  SubmitChangePassword,
  MayBePrefieldEmailBox,
  SignInPasswordField,
  NewPasswordField,
  PreviousPasswordField,
} from "../components/ProfileComponents";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postChangePassword } from "../services/apiClient";
import Alert from "../components/Alert";

export default function ChangePassword() {
  const { email, loggedInToken, storeSignedInData } = useAuth();
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
    if (loggedInToken === "") {
      handleError("Please sign in first");
      return;
    }
    try {
      const resp = await postChangePassword(
        email ?? data.get("email"),
        data.get("old-password"),
        data.get("new-password"),
        loggedInToken
      );
      storeSignedInData(
        resp.data.first_name,
        resp.data.last_name,
        resp.data.email,
        resp.data.email_verified,
        resp.data.token
      );
      navigate("/my_account");
    } catch (error) {
      handleError(error.message);
      return;
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <StyledBox>
        <ChangePasswordHeader />
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <MayBePrefieldEmailBox email={email} />
          <PreviousPasswordField />
          <NewPasswordField />
          <SubmitChangePassword />
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
