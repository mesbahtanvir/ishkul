import PrimaryAppBar from "./components/Appbar.js";
import { AuthProvider } from "./components/AuthContext.js";
import IshkulRoutes from "./components/IshkulRoutes.js";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const defaultTheme = createTheme();

function App() {
  return (
    <AuthProvider>
      <ThemeProvider theme={defaultTheme}>
        <div className="App">
          <PrimaryAppBar theme={defaultTheme} />
          <IshkulRoutes />
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
