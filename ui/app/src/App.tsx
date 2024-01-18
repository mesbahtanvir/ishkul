import { useAppSelector } from "./hooks/hooks";
import { ThemeProvider } from "@mui/material";
import IshkulAppBar from "./components/AppBar";
import { darkTheme, lightTheme } from "./theme/theme";

function App() {
  const theme = useAppSelector((state) => state.appState.theme);
  return (
    <ThemeProvider theme={theme === "dark" ? darkTheme : lightTheme}>
      <IshkulAppBar />
    </ThemeProvider>
  );
}

export default App;
