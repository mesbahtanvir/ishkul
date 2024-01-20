import MenuItem from "@mui/material/MenuItem";
import LoginIcon from "@mui/icons-material/Login";
import ListItemIcon from "@mui/material/ListItemIcon";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountCircle from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";

import InputIcon from "@mui/icons-material/Input";
import Menu from "@mui/material/Menu";
import {
  useAppSelector,
  useCloseAccountMenuHandler,
  useLogoutHandler,
} from "../hooks/hooks";
import {
  selectAccountMenuState,
  selectAccountLoginState,
} from "../store/selectors";

import { useNavigate } from "react-router-dom";

const LoggedInMenuItems: React.FC = () => {
  const navigate = useNavigate();
  const closeAccountMenu = useCloseAccountMenuHandler();
  const logout = useLogoutHandler();

  function closeAndNavigate(path: string) {
    closeAccountMenu();
    navigate(path);
  }

  function closeAndLogout(path: string) {
    closeAccountMenu();
    navigate("/");
    logout();
  }

  return (
    <>
      <MenuItem onClick={() => closeAndNavigate("/account")}>
        <ListItemIcon>
          <AccountCircle />
        </ListItemIcon>
        Account
      </MenuItem>
      <MenuItem onClick={() => closeAndNavigate("/settings")}>
        <ListItemIcon>
          <SettingsIcon />
        </ListItemIcon>
        Settings
      </MenuItem>
      <MenuItem onClick={() => closeAndLogout("/")}>
        <ListItemIcon>
          <ExitToAppIcon />
        </ListItemIcon>
        Log out
      </MenuItem>
    </>
  );
};

const LoggedOutMenuItems: React.FC = () => {
  const navigate = useNavigate();
  const closeAccountMenu = useCloseAccountMenuHandler();
  function closeAndNavigate(path: string) {
    navigate(path);
    closeAccountMenu();
  }

  return (
    <>
      <MenuItem onClick={() => closeAndNavigate("/login")}>
        <ListItemIcon>
          <LoginIcon />
        </ListItemIcon>
        Log in
      </MenuItem>
      <MenuItem onClick={() => closeAndNavigate("/signup")}>
        <ListItemIcon>
          <InputIcon />
        </ListItemIcon>
        Sign up
      </MenuItem>
    </>
  );
};

const AccountMenuPopup: React.FC = () => {
  const menuId = "primary-account-menu";
  const accountMenuState = useAppSelector(selectAccountMenuState);
  const isLoggedIn = useAppSelector(selectAccountLoginState);
  return (
    <Menu
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
      open={accountMenuState === "open"}
      onClose={useCloseAccountMenuHandler()}
    >
      {isLoggedIn ? <LoggedInMenuItems /> : <LoggedOutMenuItems />}
    </Menu>
  );
};

export default AccountMenuPopup;
