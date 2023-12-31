import { Container, Paper, Avatar, Typography, Button } from "@mui/material";
import { useAuth } from "./AuthContext";

const ProfilePage = () => {
  const { firstName, lastName, email } = useAuth();

  return (
    <Container maxWidth="sm">
      <Paper style={{ padding: "20px", marginTop: "20px" }}>
        <Avatar style={{ width: "100px", height: "100px", margin: "auto" }} />
        <Typography variant="h5" align="center">
          {firstName} {lastName}
        </Typography>
        <Typography variant="body1" align="center">
          {email}
        </Typography>
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Button variant="contained" color="primary">
            Edit Profile
          </Button>
        </div>
      </Paper>
    </Container>
  );
};

function MyAccount() {
  return <ProfilePage />;
}
export default MyAccount;
