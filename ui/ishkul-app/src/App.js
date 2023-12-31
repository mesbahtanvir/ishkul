import PrimaryAppBar from "./components/Appbar.js";
import { AuthProvider } from "./components/AuthContext.js";
import IshkulRoutes from "./components/IshkulRoutes.js";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import ThemeContextProvider, { useTheme } from "./components/ThemeContext.js";

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
        <IshkulRoutes />
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
