import MailIcon from "@mui/icons-material/Mail";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Badge from "@mui/material/Badge";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import { useAuth } from "./AuthContext";
import Alert from "./Alert";
import { Snackbar } from "@mui/material";
import { useState } from "react";

export function WebNotification() {
  const { isSignedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  if (!isSignedIn) {
    return <></>;
  }

  // Define the event handler functions
  const handleOnClick = () => {
    setIsOpen(true);
    setMessage("Stay Tuned! Coming Soon");
    // Add additional logic here
  };
  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <IconButton
        size="large"
        aria-label="show 4 new mails"
        color="inherit"
        onClick={handleOnClick} // Attach the onClick handler
      >
        <Badge badgeContent={0} color="error">
          <MailIcon />
        </Badge>
      </IconButton>
      <IconButton
        size="large"
        aria-label="show 17 new notifications"
        color="inherit"
        onClick={handleOnClick} // Attach the onClick handler
      >
        <Badge badgeContent={0} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Snackbar open={isOpen} autoHideDuration={6000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="info" sx={{ width: "100%" }}>
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}

export function MobileNotification() {
  const { isSignedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  if (!isSignedIn) {
    return <></>;
  }

  // Define the event handler functions
  const handleOnClick = () => {
    setIsOpen(true);
    setMessage("Stay Tuned! Coming Soon");
    // Add additional logic here
  };
  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <MenuItem>
        <IconButton
          size="large"
          aria-label="show 4 new mails"
          color="inherit"
          onClick={handleOnClick} // Attach the onClick handler
        >
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
          onClick={handleOnClick} // Attach the onClick handler
        >
          <Badge badgeContent={0} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <p>Notifications</p>
      </MenuItem>
      <Snackbar open={isOpen} autoHideDuration={6000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="info" sx={{ width: "100%" }}>
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}
