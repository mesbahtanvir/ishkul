import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Menu from "@mui/material/Menu";
import AccountCircle from "@mui/icons-material/AccountCircle";
import MoreIcon from "@mui/icons-material/MoreVert";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import SearchBar from "./SearchBar";
import MenuBar from "./MenuBar";
import IshkulTypography from "./IshkulTypography";
import { WebNotification } from "./Notification";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import InputIcon from "@mui/icons-material/Input";
import ListItemIcon from "@mui/material/ListItemIcon";
import { useTheme } from "./ThemeContext";

export default function PrimaryAppBar() {
  const { isSignedIn, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  console.log(isSignedIn);
  let navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleOnClickSignIn = () => {
    setAnchorEl(null);
    navigate("/sign_in");
  };
  const handleOnClickSignUp = () => {
    setAnchorEl(null);
    navigate("/sign_up");
  };
  const handleOnClickMyAccount = () => {
    setAnchorEl(null);
    navigate("/my_account");
  };
  const handleOnClickSignOut = () => {
    setAnchorEl(null);
    signOut();
    navigate("/");
  };

  const handleThemeOnClick = () => {
    toggleTheme();
  };
  function ThemeModeButton() {
    return (
      <IconButton
        size="large"
        aria-label="theme"
        color="inherit"
        onClick={handleThemeOnClick} // Attach the onClick handler
      >
        {theme === "light" ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    );
  }

  const menuId = "primary-search-account-menu";
  function MenuItems({ userSignedIn }) {
    if (userSignedIn) {
      return (
        <>
          <MenuItem onClick={handleOnClickSignOut}>
            {" "}
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            Logout
          </MenuItem>
          <MenuItem onClick={handleOnClickMyAccount}>
            <ListItemIcon>
              <AccountBoxIcon />
            </ListItemIcon>
            Account
          </MenuItem>
        </>
      );
    }
    return (
      <>
        <MenuItem onClick={handleOnClickSignIn}>
          <ListItemIcon>
            <LoginIcon />
          </ListItemIcon>
          Login
        </MenuItem>
        <MenuItem onClick={handleOnClickSignUp}>
          <ListItemIcon>
            <InputIcon />
          </ListItemIcon>
          Register
        </MenuItem>
      </>
    );
  }
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      id={menuId}
      keepMounted
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItems userSignedIn={isSignedIn} />
    </Menu>
  );
  const mobileMenuId = "primary-search-account-menu-mobile";

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <MenuBar />
          <IshkulTypography />
          <SearchBar />
          <Box sx={{ flexGrow: 1 }} />
          <ThemeModeButton />
          <Box sx={{ display: { xs: "none", md: "flex" } }}>
            <WebNotification />
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls={menuId}
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
          </Box>
          <Box sx={{ display: { xs: "flex", md: "none" } }}>
            <IconButton
              size="large"
              aria-label="show more"
              aria-controls={mobileMenuId}
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <MoreIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      {renderMenu}
    </Box>
  );
}
