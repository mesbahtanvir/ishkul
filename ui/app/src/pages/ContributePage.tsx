import * as React from "react";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import { StyledBox } from "./../components/ProfileComponents";
import UploadDoc from "./../components/UploadDoc";
import { useAppSelector } from "../hooks/hooks";
import { selectAccountState } from "../store/selectors";
import LoginRequiredPage from "./LoginRequiredPage";

const ContributePage: React.FC = () => {
  const user = useAppSelector(selectAccountState);

  if (!user.isLoggedIn) {
    return <LoginRequiredPage />;
  }

  return (
    <Container component="main" maxWidth="lg">
      <CssBaseline />
      <StyledBox>
        <UploadDoc />
      </StyledBox>
    </Container>
  );
};

export default ContributePage;
