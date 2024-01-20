import * as React from "react";
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
} from "../components/ProfileComponents";
import { postRegisterUser } from "../services/apiClient";
import { styled } from "@mui/material/styles";
import { enqueueSnackbar } from "notistack";

export default function SignupPage() {
  let navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const data = new FormData(event.currentTarget);
      await postRegisterUser({
        first_name: data.get("firstName") as string,
        last_name: data.get("lastName") as string,
        email: data.get("email") as string,
        password: data.get("password") as string,
      });
      enqueueSnackbar("User registered");
    } catch (error) {
      enqueueSnackbar((error as Error).message, { variant: "error" });
      return;
    }
    navigate("/login");
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

  const AlreadyHaveAccount = () => {
    return (
      <Grid item>
        <StyledLink href="/login" variant="body2">
          Already have an account?
        </StyledLink>
      </Grid>
    );
  };
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
          </Grid>
          <SingUpSubmit />
          <Grid container justifyContent="flex-end">
            <AlreadyHaveAccount />
          </Grid>
        </Box>
      </StyledBox>
    </Container>
  );
}
