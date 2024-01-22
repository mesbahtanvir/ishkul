// BottomNav.tsx
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import RuleIcon from "@mui/icons-material/Rule";
import "./BottomNav.css"; // Import the CSS file
import { useAppSelector, useUpdateBottonNavHandler } from "../hooks/hooks";
import { selectAppState } from "../store/selectors";
import { BottomNavbar } from "../models/enum";

const BottomNav: React.FC = () => {
  const appState = useAppSelector(selectAppState);
  const updateBottomNavbar = useUpdateBottonNavHandler();
  const handleChange = (
    event: React.ChangeEvent<{}>,
    newValue: BottomNavbar,
  ): void => {
    updateBottomNavbar(newValue);
  };

  return (
    <BottomNavigation
      value={appState.bottomNavbar}
      onChange={handleChange}
      showLabels
      className="fixed-bottom-nav" // Apply the CSS class
    >
      <BottomNavigationAction
        value={BottomNavbar.Upload}
        label={BottomNavbar.Upload}
        icon={<CloudUploadIcon />}
      />
      <BottomNavigationAction
        value={BottomNavbar.Validate}
        label={BottomNavbar.Validate}
        icon={<RuleIcon />}
      />
      <BottomNavigationAction
        value={BottomNavbar.MyStats}
        label={BottomNavbar.MyStats}
        icon={<DoneAllIcon />}
      />
    </BottomNavigation>
  );
};

export default BottomNav;
