import { Container, Paper, Avatar, Typography } from "@mui/material";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PendingIcon from "@mui/icons-material/Pending";
import { selectAccountState } from "../store/selectors";
import { useAppSelector } from "../hooks/hooks";
import {
  ChangePasswordWithRedirection,
  EmailVerificationInfoBox,
} from "../components/ProfileComponents";

const AccountPage: React.FC = () => {
  const user = useAppSelector(selectAccountState).user;

  function EmailVerified() {
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
          {user.email}{" "}
          <VerifiedUserIcon style={{ color: "green", marginLeft: "5px" }} />
        </Typography>
      </div>
    );
  }

  function EmailUnverified() {
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
          {user.email}{" "}
          <PendingIcon style={{ color: "red", marginLeft: "5px" }} />
        </Typography>
      </div>
    );
  }

  function AccountEmailWithVefication() {
    return user.verified ? <EmailVerified /> : <EmailUnverified />;
  }

  function AccountAction() {
    return (
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <Box>
          {user.verified ? (
            <ChangePasswordWithRedirection />
          ) : (
            <EmailVerificationInfoBox />
          )}
        </Box>
      </div>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Paper style={{ padding: "20px", marginTop: "20px" }}>
        <Avatar style={{ width: "100px", height: "100px", margin: "auto" }} />
        <Typography variant="h5" align="center">
          {user.first_name} {user.last_name}
        </Typography>
        <AccountEmailWithVefication />
        <AccountAction />
      </Paper>
    </Container>
  );
};

export default AccountPage;
