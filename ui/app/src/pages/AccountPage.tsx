import { Container, Paper, Avatar, Typography } from "@mui/material";
import Box from "@mui/material/Box";
import { ProfileChangePasswordOrVerifyEmailFooter } from "../components/ProfileComponents";
import CssBaseline from "@mui/material/CssBaseline";
import { useNavigate } from "react-router-dom";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PendingIcon from "@mui/icons-material/Pending";
import { postSendVerificationCode } from "../services/apiClient";
import { selectAccountState } from "../store/selectors";
import { useAppSelector } from "../hooks/hooks";

const ProfileInfo: React.FC = () => {
  let navigate = useNavigate();
  const userInfo = useAppSelector(selectAccountState).user;
  function handleOnSubmit() {
    if (userInfo.verified) {
      navigate("/change_password");
      return;
    }
    postSendVerificationCode({ email: userInfo.email });
    navigate("/validate_email");
  }

  interface EmailVerifiedProps {
    email: string;
  }
  function EmailVerified(props: EmailVerifiedProps) {
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
          {props.email}{" "}
          <VerifiedUserIcon style={{ color: "green", marginLeft: "5px" }} />
        </Typography>
      </div>
    );
  }

  interface EmailUnVerifiedProps {
    email: string;
  }
  function EmailUnverified(props: EmailUnVerifiedProps) {
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
          {props.email}{" "}
          <PendingIcon style={{ color: "red", marginLeft: "5px" }} />
        </Typography>
      </div>
    );
  }

  interface AccountEmailWithVeficationProps {
    email: string;
  }

  function AccountEmailWithVefication(props: AccountEmailWithVeficationProps) {
    if (props.email.trim() !== "") {
      return <EmailVerified email={props.email} />;
    }
    return <EmailUnverified email={props.email} />;
  }

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Paper style={{ padding: "20px", marginTop: "20px" }}>
        <Avatar style={{ width: "100px", height: "100px", margin: "auto" }} />
        <Typography variant="h5" align="center">
          {userInfo.first_name} {userInfo.last_name}
        </Typography>
        <AccountEmailWithVefication email={userInfo.email} />
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

const AccountPage: React.FC = () => {
  return <ProfileInfo />;
};
export default AccountPage;
