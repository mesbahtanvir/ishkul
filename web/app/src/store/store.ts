import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web
import appStateReducer from "./app/appState";
import accountStateReducer from "./account/account";
import resourceStateReducer from "./resources/resources";
import contributeResourcesReducer from "./contribute/contribute";

// Persist config for accountState
const persistConfig = {
  key: "account",
  storage,
};

// Persisted reducer
const persistedAccountReducer = persistReducer(
  persistConfig,
  accountStateReducer,
);

export const store = configureStore({
  reducer: {
    appState: appStateReducer,
    accountState: persistedAccountReducer,
    resourceState: resourceStateReducer,
    contributeResourcesState: contributeResourcesReducer,
  },
  devTools: process.env.NODE_ENV !== "production",
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
