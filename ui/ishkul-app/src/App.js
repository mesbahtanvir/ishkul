import PrimaryAppBar from "./components/Appbar.js";
import { AuthProvider } from "./context/AuthContext.js";
import IshkulRouterWithTracker from "./components/IshkulRoutes.js";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import ThemeContextProvider, { useTheme } from "./context/ThemeContext.js";

const lightTheme = createTheme({
  palette: {
    mode: "light",
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

function AppWithTheme() {
  const { theme } = useTheme();
  return (
    <ThemeProvider theme={theme === "light" ? lightTheme : darkTheme}>
      <div className="App">
        <PrimaryAppBar theme={theme === "light" ? lightTheme : darkTheme} />
        <IshkulRouterWithTracker />
      </div>
    </ThemeProvider>
  );
}

function App() {
  return (
    <ThemeContextProvider>
      <AuthProvider>
        <AppWithTheme />
      </AuthProvider>
    </ThemeContextProvider>
  );
}

export default App;
