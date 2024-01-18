import { configureStore } from "@reduxjs/toolkit";
import appStateReducer from "./app/appState";

export const store = configureStore({
  reducer: {
    appState: appStateReducer,
  },
  devTools: process.env.NODE_ENV !== "production", // Enable Redux DevTools only in development
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
