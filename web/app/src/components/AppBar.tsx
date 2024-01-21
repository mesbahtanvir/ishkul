import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import MenuIcon from "@mui/icons-material/Menu";
import SideBar from "./SideBar";
import AccountMenuPopup from "./AccountMenuPopup";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";

import {
  useAppSelector,
  useToggleThemeHandler,
  useOpenSideBarHandler,
  useOpenAccountMenuHandler,
} from "../hooks/hooks";

const ThemeToggler: React.FC = () => {
  const theme = useAppSelector((state) => state.appState.theme);
  return (
    <IconButton color="inherit" onClick={useToggleThemeHandler()}>
      {theme === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
    </IconButton>
  );
};

const SideBarOpener: React.FC = () => {
  return (
    <>
      <IconButton color="inherit" onClick={useOpenSideBarHandler()}>
        <MenuIcon />
      </IconButton>
      <SideBar />
    </>
  );
};

const BrandName: React.FC = () => {
  return (
    <Typography variant="h6" sx={{ flexGrow: 1 }}>
      ISHKUL
    </Typography>
  );
};

const AccountOpener: React.FC = () => {
  return (
    <>
      <IconButton color="inherit" onClick={useOpenAccountMenuHandler()}>
        <ManageAccountsIcon />
      </IconButton>
      <AccountMenuPopup />
    </>
  );
};

const IshkulAppBar: React.FC = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <SideBarOpener />
          <BrandName />
          <ThemeToggler />
          <AccountOpener />
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default IshkulAppBar;
