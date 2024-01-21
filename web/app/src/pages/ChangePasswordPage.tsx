import React, { FormEvent } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import {
  StyledBox,
  ChangePasswordHeader,
  PrefieldEmailBox,
  NewPasswordField,
  ChangePassword,
} from "../components/ProfileComponents";
import { useNavigate } from "react-router-dom";
import { postChangePassword } from "../services/apiClient";
import { selectAccountState } from "../store/selectors";
import { useAppSelector, useLoginHandler } from "../hooks/hooks";
import { enqueueSnackbar } from "notistack";

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const account = useAppSelector(selectAccountState);
  const loginHandler = useLoginHandler();
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const resp = await postChangePassword({
        email: account.user.email,
        new_password: data.get("new-password") as string,
        token: account.token,
      });
      loginHandler(resp.data.token);
    } catch (error: unknown) {
      enqueueSnackbar((error as Error).message, { variant: "error" });
      return;
    }
    enqueueSnackbar("password has changed", { variant: "success" });
    navigate("/account");
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <StyledBox>
        <ChangePasswordHeader />
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <PrefieldEmailBox email={account.user.email} />
          <NewPasswordField />
          <ChangePassword />
        </Box>
      </StyledBox>
    </Container>
  );
};

export default ChangePasswordPage;
