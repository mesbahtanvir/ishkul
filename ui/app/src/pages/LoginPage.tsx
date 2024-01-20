import React from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import { useNavigate, NavigateFunction } from "react-router-dom";
import { postLoginUser } from "../services/apiClient";
import {
  ForgotAndSignupBox,
  SignInEmailField,
  SignInPasswordField,
  SignInSubmitButton,
  StyledBox,
} from "../components/ProfileComponents";
import { useSnackbar } from "notistack";
import { useLoginHandler } from "../hooks/hooks";
import { LoginUserResponse } from "../models/model";

const Login: React.FC = () => {
  const navigate: NavigateFunction = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const loginHandler = useLoginHandler();

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    let resp: LoginUserResponse;
    try {
      resp = await postLoginUser({
        email: data.get("email") as string,
        password: data.get("password") as string,
      });
      loginHandler(resp.data.token);
      enqueueSnackbar("login successful", { variant: "success" });
    } catch (error: unknown) {
      enqueueSnackbar((error as Error).message, { variant: "error" });
      return;
    }
    navigate("/account");
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <StyledBox>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <SignInEmailField />
          <SignInPasswordField />
          <SignInSubmitButton />
          <ForgotAndSignupBox />
        </Box>
      </StyledBox>
    </Container>
  );
};

export default Login;
