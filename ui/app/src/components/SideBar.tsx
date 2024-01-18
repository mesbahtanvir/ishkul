import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import PsychologyIcon from "@mui/icons-material/Psychology";
import HomeIcon from "@mui/icons-material/Home";

import { selectSideBarState } from "../store/selectors";
import {
  useAppSelector,
  useCloseSideBarHandler,
  useOpenSideBarHandler,
} from "../hooks/hooks";

import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  ListItemButton,
  SwipeableDrawer,
} from "@mui/material";

const menuItems = [
  { text: "Home", icon: <HomeIcon /> },
  { text: "Resources", icon: <LibraryBooksIcon /> },
  { text: "Practice", icon: <PsychologyIcon /> },
  { text: "Contribute", icon: <CloudUploadIcon /> },
];

export default function SideBar() {
  const sideBarState = useAppSelector(selectSideBarState);
  const closeSideBar = useCloseSideBarHandler();
  const openSideBar = useOpenSideBarHandler();

  return (
    <>
      <SwipeableDrawer
        anchor="left"
        open={sideBarState === "open"}
        onClose={closeSideBar}
        onOpen={openSideBar}
      >
        <DrawerContent closeSideBar={closeSideBar} />
      </SwipeableDrawer>
    </>
  );
}

// Defining the type for the props
interface DrawerContentProps {
  closeSideBar: () => void;
}

const DrawerContent: React.FC<DrawerContentProps> = ({ closeSideBar }) => {
  return (
    <Box
      role="presentation"
      sx={{ width: 200 }}
      onClick={closeSideBar}
      onKeyDown={closeSideBar}
    >
      <List>
        {menuItems.map((item, index) => (
          <ListItem key={index} disablePadding>
            <ListItemButton>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};
