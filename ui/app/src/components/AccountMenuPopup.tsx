import MenuItem from "@mui/material/MenuItem";
import LoginIcon from "@mui/icons-material/Login";
import ListItemIcon from "@mui/material/ListItemIcon";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountCircle from "@mui/icons-material/AccountCircle";

import InputIcon from "@mui/icons-material/Input";
import Menu from "@mui/material/Menu";
import { useAppSelector, useCloseAccountMenuHandler } from "../hooks/hooks";
import {
  selectAccountMenuState,
  selectAccountLoginState,
} from "../store/selectors";

const LoggedInMenuItems: React.FC = () => {
  return (
    <>
      {" "}
      <MenuItem onClick={() => {}}>
        <ListItemIcon>
          <AccountCircle />
        </ListItemIcon>
        Profile
      </MenuItem>
      <MenuItem onClick={() => {}}>
        <ListItemIcon>
          <SettingsIcon />
        </ListItemIcon>
        Settings
      </MenuItem>
    </>
  );
};

const LoggedOutMenuItems: React.FC = () => {
  return (
    <>
      {" "}
      <MenuItem onClick={() => {}}>
        <ListItemIcon>
          <LoginIcon />
        </ListItemIcon>
        Log in
      </MenuItem>
      <MenuItem onClick={() => {}}>
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
