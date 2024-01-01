import { Container, Paper, Avatar, Typography } from "@mui/material";
import { useAuth } from "./AuthContext";
import Box from "@mui/material/Box";
import { ProfileChangePasswordOrVerifyEmailFooter } from "./ProfileComponents";
import CssBaseline from "@mui/material/CssBaseline";
import { useNavigate } from "react-router-dom";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PendingIcon from "@mui/icons-material/Pending";
import { postSendVerificationCode } from "../service/apiClient";

const ProfilePage = () => {
  const { firstName, lastName, email, emailVerified } = useAuth();
  let navigate = useNavigate();

  function handleOnSubmit() {
    if (emailVerified) {
      navigate("/change_password");
      return;
    }
    postSendVerificationCode(email);
    navigate("/validate_email");
  }
  function EmailVerified({ email }) {
    return (
      <div>
        <Typography
          variant="body1"
          align="center"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {email}{" "}
          <VerifiedUserIcon style={{ color: "green", marginLeft: "5px" }} />
        </Typography>
      </div>
    );
  }

  function EmailUnverified({ email }) {
    return (
      <div>
        <Typography
          variant="body1"
          align="center"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {email} <PendingIcon style={{ color: "red", marginLeft: "5px" }} />
        </Typography>
      </div>
    );
  }

  function AccountEmailWithVefication({ email }) {
    if (emailVerified) {
      return <EmailVerified email={email} />;
    }
    return <EmailUnverified email={email} />;
  }

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Paper style={{ padding: "20px", marginTop: "20px" }}>
        <Avatar style={{ width: "100px", height: "100px", margin: "auto" }} />
        <Typography variant="h5" align="center">
          {firstName} {lastName}
        </Typography>
        <AccountEmailWithVefication email={email} />
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Box
            component="form"
            onSubmit={handleOnSubmit}
            noValidate
            sx={{ mt: 1 }}
          >
            <ProfileChangePasswordOrVerifyEmailFooter />
          </Box>
        </div>
      </Paper>
    </Container>
  );
};

function MyAccount() {
  return <ProfilePage />;
}
export default MyAccount;
