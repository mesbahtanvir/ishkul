import { Snackbar } from "@mui/material";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import { useState } from "react";
import {
  CopyWriteUnderInput,
  StyledBox,
  ChangePasswordHeader,
  SubmitChangePassword,
  MayBePrefieldEmailBox,
  NewPasswordField,
  PreviousPasswordField,
} from "../components/ProfileComponents";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postChangePassword } from "../services/apiClient";
import Alert from "../components/Alert";

export default function ChangePassword() {
  const { authInfo, setAuthInfo } = useAuth();
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
    if (authInfo.user === undefined) {
      handleError("Please sign in first");
      return;
    }
    try {
      const resp = await postChangePassword(
        authInfo.user.email ?? data.get("email"),
        data.get("old-password"),
        data.get("new-password"),
        authInfo.token
      );
      setAuthInfo(resp.data.token);
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
          <MayBePrefieldEmailBox email={authInfo.user.email} />
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
