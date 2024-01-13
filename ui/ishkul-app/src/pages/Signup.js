import * as React from "react";
import { useState } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useNavigate } from "react-router-dom";
import {
  StyledBox,
  SignUpHeader,
  SignUpFirstNameField,
  SignUpLastNameField,
  SignUpEmailField,
  SignUpPasswordField,
  SingUpSubmit,
  CopyWriteUnderInput,
  AllowExtraEmailsConfirmation,
} from "../components/ProfileComponents";
import { Snackbar, Alert } from "@mui/material";
import { postRegisterUser } from "../services/apiClient";
import { styled } from "@mui/material/styles";

export default function SignUp() {
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [checked, setChecked] = useState(false);

  const handleError = (message) => {
    setIsError(true);
    setErrorMessage(message);
  };
  // Function to close the Snackbar
  const handleClose = () => {
    setIsError(false);
  };

  let navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const data = new FormData(event.currentTarget);
      await postRegisterUser({
        first_name: data.get("firstName"),
        last_name: data.get("lastName"),
        email: data.get("email"),
        password: data.get("password"),
        allow_extra_email: checked,
      });
    } catch (error) {
      handleError(error.message);
      return;
    }
    navigate("/sign_in");
  };

  const StyledLink = styled(Link)(({ theme }) => ({
    textDecoration: "none",
    color: theme.palette.primary.main, // Customize as needed
    "&:hover": {
      textDecoration: "underline",
      color: theme.palette.secondary.main, // Customize as needed
      transition: "color 0.3s",
    },
    // Additional styling here
  }));

  const alreadyAccountSignIn = (
    <Grid item>
      <StyledLink href="/sign_in" variant="body2">
        Already have an account? Sign in
      </StyledLink>
    </Grid>
  );
  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <StyledBox>
        <SignUpHeader />
        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <SignUpFirstNameField />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SignUpLastNameField />
            </Grid>
            <Grid item xs={12}>
              <SignUpEmailField />
            </Grid>
            <Grid item xs={12}>
              <SignUpPasswordField />
            </Grid>
            <Grid item xs={12}>
              <AllowExtraEmailsConfirmation setChecked={setChecked} />
            </Grid>
          </Grid>
          <SingUpSubmit />
          <Grid container justifyContent="flex-end">
            {alreadyAccountSignIn}
          </Grid>
        </Box>
      </StyledBox>
      <CopyWriteUnderInput />
      <Snackbar open={isError} autoHideDuration={6000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
