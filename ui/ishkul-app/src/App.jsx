import PrimaryAppBar from "./components/Appbar.js";
import { AuthProvider } from "./components/AuthContext.js";
import { BrowserRouter } from "react-router-dom";
import IshkulRoutes from "./components/IshkulRoutes.jsx";
import { createTheme, ThemeProvider } from '@mui/material/styles';

const defaultTheme = createTheme()

function App() {
  return (
    <AuthProvider>
    <ThemeProvider theme={defaultTheme}>
      <BrowserRouter>
        <div className="App">
          <PrimaryAppBar theme={defaultTheme} />
          <IshkulRoutes />
        </div>
      </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>

  );
}

export default App;
