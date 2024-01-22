import * as React from "react";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import { StyledBox } from "../components/ProfileComponents";
import UploadDoc from "../components/UploadDoc";
import { useAppSelector } from "../hooks/hooks";
import { selectAccountState, selectAppState } from "../store/selectors";
import VerifiedContributorOnly from "./VerifiedContributorOnly";
import BottomNav from "../components/BottomNav";
import { BottomNavbar } from "../models/enum";

const ContributorSubpageSwitcher: React.FC = () => {
  const appState = useAppSelector(selectAppState);
  console.log(appState.bottomNavbar);
  switch (appState.bottomNavbar) {
    case BottomNavbar.Upload:
      return <UploadDoc />;
    case BottomNavbar.Validate:
      return <></>;
    case BottomNavbar.MyStats:
      return <></>;
  }
  return <></>;
};

const ContributePage: React.FC = () => {
  const account = useAppSelector(selectAccountState);
  console.log(account.user);

  if (
    !(
      account.isLoggedIn &&
      account.user.is_verified &&
      account.user.is_contributor
    )
  ) {
    return <VerifiedContributorOnly />;
  }

  return (
    <Container component="main" maxWidth="lg">
      <CssBaseline />
      <StyledBox>
        <ContributorSubpageSwitcher />
        <BottomNav />
      </StyledBox>
    </Container>
  );
};

export default ContributePage;
