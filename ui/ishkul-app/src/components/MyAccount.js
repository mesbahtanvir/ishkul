import { Container, Paper, Avatar, Typography } from "@mui/material";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import { SubmitChangePassword } from "./ProfileComponents";

const ProfilePage = () => {
  const { firstName, lastName, email } = useAuth();
  let navigate = useNavigate();

  function handleOnSubmit() {
    navigate("/change_password");
  }

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
          <Box
            component="form"
            onSubmit={handleOnSubmit}
            noValidate
            sx={{ mt: 1 }}
          >
            <SubmitChangePassword />
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
