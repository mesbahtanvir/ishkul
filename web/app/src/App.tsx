import { useAppSelector } from "./hooks/hooks";
import { ThemeProvider } from "@mui/material";
import IshkulAppBar from "./components/AppBar";
import { darkTheme, lightTheme } from "./theme/theme";
import { SnackbarProvider } from "notistack";
import RoutesWithTracker from "./components/Routes";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./store/store";
import { Provider } from "react-redux";

function AppWithTracker() {
  return (
    <div className="App">
      <IshkulAppBar />
      <RoutesWithTracker />
    </div>
  );
}

function App() {
  const theme = useAppSelector((state) => state.appState.theme);
  return (
    <ThemeProvider theme={theme === "dark" ? darkTheme : lightTheme}>
      <SnackbarProvider>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <AppWithTracker />
          </PersistGate>
        </Provider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
