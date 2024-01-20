import { Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";

import {
  StyledBox,
  CodeField,
  SubmitVerificationCode,
  AccountVerifyHeader,
  PrefieldEmailBox,
} from "../components/ProfileComponents";
import { postVerifyAccount } from "../services/apiClient";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../hooks/hooks";
import { selectAccountState } from "../store/selectors";
import { login } from "../store/account/account";
import { enqueueSnackbar } from "notistack";

export default function AccountVerify() {
  const account = useAppSelector(selectAccountState);
  let navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const data = new FormData(event.currentTarget);
      const resp = await postVerifyAccount({
        email: account.user.email,
        code: data.get("code") as string,
        token: account.token,
      });
      login({ token: resp.data.token });
      navigate("/account");
    } catch (error: unknown) {
      enqueueSnackbar((error as Error).message, { variant: "error" });
      return;
    }
  };

  const InfoSection = () => {
    const text = "A code has been sent your email: " + account.user.email;
    return <Typography variant="caption">{text}</Typography>;
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <StyledBox>
        <AccountVerifyHeader />
        <InfoSection />
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <PrefieldEmailBox email={account.user.email} />
          <CodeField />
          <SubmitVerificationCode />
        </Box>
      </StyledBox>
    </Container>
  );
}
