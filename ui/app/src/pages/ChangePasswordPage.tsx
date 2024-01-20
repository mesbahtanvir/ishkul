import React, { FormEvent } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import {
  StyledBox,
  ChangePasswordHeader,
  PrefieldEmailBox,
  NewPasswordField,
  OldPasswordField,
  ChangePassword,
} from "../components/ProfileComponents";
import { useNavigate } from "react-router-dom";
import { postChangePassword } from "../services/apiClient";
import { selectAccountState } from "../store/selectors";
import { useAppSelector } from "../hooks/hooks";
import { enqueueSnackbar } from "notistack";
import { login } from "../store/account/account";

interface ChangePasswordProps {
  // Define props here if any
}

const ChangePasswordPage: React.FC<ChangePasswordProps> = () => {
  const navigate = useNavigate();
  const account = useAppSelector(selectAccountState);
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const resp = await postChangePassword({
        email: account.user.email,
        old_password: data.get("old-password") as string,
        new_password: data.get("new-password") as string,
        token: account.token,
      });
      login({ token: resp.data.token });
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
          <OldPasswordField />
          <NewPasswordField />
          <ChangePassword />
        </Box>
      </StyledBox>
    </Container>
  );
};

export default ChangePasswordPage;
