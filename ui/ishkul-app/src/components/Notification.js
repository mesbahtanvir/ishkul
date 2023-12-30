import MailIcon from "@mui/icons-material/Mail";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Badge from "@mui/material/Badge";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import { useAuth } from "./AuthContext";

export function WebNotification() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) {
    return <></>;
  }
  return (
    <>
      <IconButton size="large" aria-label="show 4 new mails" color="inherit">
        <Badge badgeContent={0} color="error">
          <MailIcon />
        </Badge>
      </IconButton>
      <IconButton
        size="large"
        aria-label="show 17 new notifications"
        color="inherit"
      >
        <Badge badgeContent={0} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
    </>
  );
}

export function MobileNotification() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) {
    return <></>;
  }
  return (
    <>
      <MenuItem>
        <IconButton size="large" aria-label="show 4 new mails" color="inherit">
          <Badge badgeContent={0} color="error">
            <MailIcon />
          </Badge>
        </IconButton>
        <p>Messages</p>
      </MenuItem>
      <MenuItem>
        <IconButton
          size="large"
          aria-label="show 17 new notifications"
          color="inherit"
        >
          <Badge badgeContent={0} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <p>Notifications</p>
      </MenuItem>
    </>
  );
}
