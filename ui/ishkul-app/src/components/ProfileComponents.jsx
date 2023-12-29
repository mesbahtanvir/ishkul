import React from 'react';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Copyright from './Copyright';

export function StyledBox({ children, ...props }) {
    return (
        <Box
            sx={{
                marginTop: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                ...props.sx // This allows for additional styling if needed
            }}
            {...props} // Spread other props
        >
            {children}
        </Box>
    );
};


export function PasswordForgetGrid() {
    return (
        <Grid container>
            <Grid item xs>
                <Link href="/account_recover" variant="body2">
                    Forgot password?
                </Link>
            </Grid>
            <Grid item>
                <Link href="/sign_up" variant="body2">
                    {"Don't have an account? Sign Up"}
                </Link>
            </Grid>
        </Grid>
    );
}

export function SignInHeader() {
    return (
        <>
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
                Sign in
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
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
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
        <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
        >
            Sign In
        </Button>
    );
}

export function SignUpHeader() {
    return (
        <>
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
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
            label="Email Address"
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


export function AllowExtraEmailsConfirmation(){
    return (
        <FormControlLabel
        control={<Checkbox value="allowExtraEmails" color="primary" />}
        label="I want to receive inspiration, marketing promotions and updates via email."
      />
    );
}

export function SingUpSubmit(){
    return (          <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
      >
        Register
      </Button>);
}


export function CopyWriteUnderInput() {
    return (<Copyright sx={{ mt: 8, mb: 4 }} />)

}
