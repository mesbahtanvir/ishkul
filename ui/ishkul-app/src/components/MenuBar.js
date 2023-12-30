import React, { useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import IconButton from "@mui/material/IconButton";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import { ListItemButton } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function MenuBar() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  let navigate = useNavigate();
  const list = () => (
    <div
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <List>
        {["Resources", "Practice", "Contribute"].map((text, index) => (
          <ListItem
            key={text}
            disablePadding
            sx={{
              "&:hover": {
                backgroundColor: "#f5f5f5", // Change this color for hover effect
              },
            }}
          >
            <ListItemButton onClick={() => handleListItemClick(text)}>
              <ListItemText primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  const handleListItemClick = (text) => {
    navigate("./" + text.toLowerCase());
  };

  const toggleDrawer = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setIsDrawerOpen(open);
  };
  return (
    <>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="open drawer"
        sx={{ mr: 2 }}
        onClick={toggleDrawer(true)}
      >
        <MenuIcon />
      </IconButton>
      <SwipeableDrawer
        anchor="left"
        open={isDrawerOpen}
        onClose={toggleDrawer(false)}
      >
        {list()}
      </SwipeableDrawer>
    </>
  );
}
