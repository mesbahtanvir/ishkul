import React, { ReactNode, FormEvent } from "react";
import Box, { BoxProps } from "@mui/material/Box"; // Import Box and BoxProps from the respective library
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../hooks/hooks";
import { selectAccountState } from "../store/selectors";
import { postSendVerificationCode } from "../services/apiClient";
import { enqueueSnackbar } from "notistack";

// Define the props for StyledBox
interface StyledBoxProps extends BoxProps {
  children: ReactNode; // Define the type for children
}

export function StyledBox({ children, ...props }: StyledBoxProps) {
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
          Forgot Password?
        </Link>
      </Grid>
      <Grid item>
        <Link href="/sign_up" style={linkStyle} variant="body2">
          {"Sign Up"}
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
      <StyledTypography variant="h5">Sign in</StyledTypography>
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
        Recover Your Account
      </Typography>
    </>
  );
}

export function AccountVerifyHeader() {
  return (
    <Typography component="h1" variant="h6">
      Verify Your Account
    </Typography>
  );
}

export function ChangePasswordHeader() {
  return (
    <Typography component="h1" variant="h6">
      Change Your Password
    </Typography>
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

interface PrefieldEmailBoxProps {
  email: string;
}

export function PrefieldEmailBox(props: PrefieldEmailBoxProps) {
  return (
    <TextField
      margin="normal"
      required
      fullWidth
      id="email"
      label="Email"
      name="email"
      autoFocus
      value={props.email}
      disabled={true} // Disable editing if an email is present
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

export function ChangePassword() {
  return (
    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
      Change Password
    </Button>
  );
}

export function ChangePasswordWithRedirection() {
  let navigate = useNavigate();
  return (
    <form onSubmit={() => navigate("/change_password")}>
      <ChangePassword />
    </form>
  );
}

export function EmailVerificationInfoBox() {
  let navigate = useNavigate();
  const user = useAppSelector(selectAccountState).user;
  const handleOnSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await postSendVerificationCode({ email: user.email });
    } catch (error) {
      console.log(error);
      enqueueSnackbar((error as Error).message, { variant: "error" });
      return;
    }
    navigate("/account_verify");
    enqueueSnackbar("a code has sent to your email");
  };
  return (
    <>
      <Typography variant="caption" align="center">
        To unlock features verify your email now!
      </Typography>
      <form onSubmit={handleOnSubmit}>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{
            mt: 3,
            mb: 2,
            backgroundColor: "#FFCDD2", // Light red color
            "&:hover": {
              backgroundColor: "#EF5350", // Darker red color on hover
            },
          }}
        >
          Send Verification Code
        </Button>
      </form>
    </>
  );
}

export function SubmitVerificationCode() {
  return (
    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
      Submit Code
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

export function OldPasswordField() {
  return (
    <TextField
      required
      fullWidth
      name="old-password"
      label="Previous password"
      type="password"
      id="old-password"
      autoComplete="old-password"
    />
  );
}

export function NewPasswordField() {
  return (
    <TextField
      required
      fullWidth
      name="new-password"
      label="New password"
      type="password"
      id="new-password"
      autoComplete="new-password"
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
