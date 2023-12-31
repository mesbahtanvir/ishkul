import React from "react";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import Copyright from "./Copyright";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { styled } from "@mui/material/styles";

export function StyledBox({ children, ...props }) {
  return (
    <Box
      sx={{
        marginTop: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        ...props.sx, // This allows for additional styling if needed
      }}
      {...props} // Spread other props
    >
      {children}
    </Box>
  );
}

export function ForgotAndSingupBox() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const linkStyle = {
    textDecoration: "none",
    color: theme.palette.primary.main,
    "&:hover": {
      textDecoration: "underline",
      color: theme.palette.secondary.main,
    },
  };

  return (
    <Grid container spacing={isMobile ? 1 : 2} justifyContent="space-between">
      <Grid item>
        <Link href="/account_recover" style={linkStyle} variant="body2">
          Forgot password?
        </Link>
      </Grid>
      <Grid item>
        <Link href="/sign_up" style={linkStyle} variant="body2">
          {"Don't have an account? Sign Up"}
        </Link>
      </Grid>
    </Grid>
  );
}

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  margin: theme.spacing(1),
  backgroundColor: theme.palette.secondary.main,
  // Add any additional styling here
}));

const StyledTypography = styled(Typography)(({ theme }) => ({
  // Custom typography styles here
}));

export function SignInHeader() {
  return (
    <>
      <StyledAvatar>
        <LockOutlinedIcon />
      </StyledAvatar>
      <StyledTypography component="h1" variant="h5">
        Sign in
      </StyledTypography>
      {/* Optional: Additional elements or styling */}
    </>
  );
}

export function AccountRecoverHeader() {
  return (
    <>
      <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
        <LockOutlinedIcon />
      </Avatar>
      <Typography component="h1" variant="h5">
        Recover Account
      </Typography>
    </>
  );
}

export function AccountVerifyHeader() {
  return (
    <>
      <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
        <LockOutlinedIcon />
      </Avatar>
      <Typography component="h1" variant="h5">
        Verify Account
      </Typography>
    </>
  );
}

export function ChangePasswordHeader() {
  return (
    <>
      <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
        <LockOutlinedIcon />
      </Avatar>
      <Typography component="h1" variant="h5">
        Update Your Password
      </Typography>
    </>
  );
}

export function SignInEmailField() {
  return (
    <TextField
      margin="normal"
      required
      fullWidth
      id="email"
      label="Email"
      name="email"
      autoComplete="email"
      autoFocus
    />
  );
}

export function MayBePrefieldEmailBox({ email }) {
  const isDisabled = email && email.trim() !== "";

  return (
    <TextField
      margin="normal"
      required
      fullWidth
      id="email"
      label="Email"
      name="email"
      autoComplete="email"
      autoFocus
      value={email || ""} // Prefill the email, if provided
      disabled={isDisabled} // Disable editing if an email is present
    />
  );
}

export function SignInPasswordField() {
  return (
    <TextField
      margin="normal"
      required
      fullWidth
      name="password"
      label="Password"
      type="password"
      id="password"
      autoComplete="current-password"
    />
  );
}

export function CodeField() {
  return (
    <TextField
      margin="normal"
      required
      fullWidth
      name="code"
      label="Code"
      type="code"
      id="code"
      autoComplete="verification-code"
    />
  );
}

export function RememberMe() {
  return (
    <FormControlLabel
      control={<Checkbox value="remember" color="primary" />}
      label="Remember me"
    />
  );
}

export function SignInSubmitButton() {
  return (
    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
      Sign In
    </Button>
  );
}

export function SendVerificationCode() {
  return (
    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
      Send Verification Code
    </Button>
  );
}

export function SubmitChangePassword() {
  return (
    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
      Change Password
    </Button>
  );
}

export function SubmitVerificationCode() {
  return (
    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
      Submit Verification Code
    </Button>
  );
}

export function SignUpHeader() {
  return (
    <>
      <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
        <LockOutlinedIcon />
      </Avatar>
      <Typography component="h1" variant="h5">
        Register
      </Typography>
    </>
  );
}

export function SignUpFirstNameField() {
  return (
    <TextField
      autoComplete="given-name"
      name="firstName"
      required
      fullWidth
      id="firstName"
      label="First Name"
      autoFocus
    />
  );
}
export function SignUpLastNameField() {
  return (
    <TextField
      required
      fullWidth
      id="lastName"
      label="Last Name"
      name="lastName"
      autoComplete="family-name"
    />
  );
}

export function SignUpEmailField() {
  return (
    <TextField
      required
      fullWidth
      id="email"
      label="Email"
      name="email"
      autoComplete="email"
    />
  );
}

export function SignUpPasswordField() {
  return (
    <TextField
      required
      fullWidth
      name="password"
      label="Password"
      type="password"
      id="password"
      autoComplete="new-password"
    />
  );
}

export function AllowExtraEmailsConfirmation({ setChecked }) {
  // Handle change event of the checkbox
  const handleCheckboxChange = (event) => {
    setChecked(event.target.checked);
  };

  return (
    <FormControlLabel
      control={
        <Checkbox
          value="allowExtraEmails"
          color="primary"
          checked={false}
          onChange={handleCheckboxChange}
        />
      }
      label="I want to receive inspiration, marketing promotions and updates via email."
    />
  );
}

export function SingUpSubmit() {
  return (
    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
      Register
    </Button>
  );
}

export function CopyWriteUnderInput() {
  return <Copyright sx={{ mt: 8, mb: 4 }} />;
}
