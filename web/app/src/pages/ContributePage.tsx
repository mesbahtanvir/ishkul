import * as React from "react";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import { StyledBox } from "../components/ProfileComponents";
import UploadDoc from "../components/UploadDoc";
import { useAppSelector } from "../hooks/hooks";
import { selectAccountState } from "../store/selectors";
import UnderConstructionPage from "./UnderConstructionPage";

const ContributePage: React.FC = () => {
  const account = useAppSelector(selectAccountState);

  if (!account.isLoggedIn || !account.user.is_admin) {
    return <UnderConstructionPage />;
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
