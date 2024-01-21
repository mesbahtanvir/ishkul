import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import * as React from "react";
import {
  SignInEmailField,
  AccountRecoverHeader,
  StyledBox,
  SendVerificationCode,
} from "../components/ProfileComponents";

import { postSendVerificationCode } from "../services/apiClient";
import { enqueueSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

export default function AccountRecoverPage() {
  let navigate = useNavigate();
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const data = new FormData(event.currentTarget);
      const email = data.get("email") as string;
      await postSendVerificationCode({ email: email });
      enqueueSnackbar("Verification code sent");
      navigate("/account_verify?email=" + email);
    } catch (error) {
      enqueueSnackbar((error as Error).message, { variant: "error" });
    }
  };

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
    </Container>
  );
}
