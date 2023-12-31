import { Snackbar, Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import * as React from "react";
import { useState } from "react";
import { useAuth } from "./AuthContext";
import {
  CopyWriteUnderInput,
  StyledBox,
  CodeField,
  SubmitVerificationCode,
  AccountVerifyHeader,
  MayBePrefieldEmailBox,
} from "./ProfileComponents";
import { postVerifyAccount } from "../service/apiClient";
import Alert from "./Alert";
import { useNavigate } from "react-router-dom";

export default function AccountVerify({ email }) {
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
      const submit_email = email ?? data.get("email");
      const resp = await postVerifyAccount(submit_email, data.get("code"));
      storeSignedInData(
        resp.data.first_name,
        resp.data.last_name,
        resp.data.email,
        resp.data.token
      );
      navigate("/change_password");
    } catch (error) {
      handleError(error.message);
      return;
    }
  };

  const InfoSection = () => {
    var text = "";
    if (typeof email !== "undefined" && email !== "") {
      text = "A code has been sent your email: " + email;
    } else {
      text = "Enter your email and verification code";
    }
    return <Typography variant="caption">{text}</Typography>;
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <StyledBox>
        <AccountVerifyHeader />
        <InfoSection />
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <MayBePrefieldEmailBox email={email} />
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
