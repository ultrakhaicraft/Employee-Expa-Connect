import { combineReducers, configureStore } from "@reduxjs/toolkit";
import authReducer, { logout } from "./authSlice.ts";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage"; // Uses localStorage
import chatReducer, { reset as resetChat } from '../redux/chatSlice.ts';
import conversationReducer, { resetConversationState } from '../redux/conversationSlice.ts';
import { signalRService } from '../services/signalRService';
import { conversationSignalRService } from '../services/conversationSignalRService';
import notificationService from "@/services/notificationService.ts";

const persistConfig = {
  key: "root",
  version: 1,
  storage, // Persist data in localStorage
};

const rootReducer = combineReducers({
  auth: authReducer,
  chat: chatReducer,
  conversation: conversationReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

// ✅ Middleware to clear chat data on logout
const clearChatOnLogout = (store: any) => (next: any) => (action: any) => {
  if (action.type === logout.type) {
    console.log("🔴 Logout detected - Clearing all chat data");
    
    // 1. Clear chat state from Redux
    store.dispatch(resetChat());
    store.dispatch(resetConversationState());
    
    // 2. Clear localStorage chat-related data
    localStorage.removeItem("currentConversationId");
    localStorage.removeItem("ip_location_cache");
    localStorage.removeItem("ip_location_cache_time");
    
    // 3. Disconnect SignalR connections
    signalRService.disconnect().catch((err) => {
      console.error("Error disconnecting SignalR:", err);
    });
    conversationSignalRService.disconnect().catch((err) => {
      console.error("Error disconnecting ConversationHub:", err);
    });
    notificationService.disconnect().catch((err) => {
      console.error("Error disconnecting GeneralHub:", err);
    });
    
    console.log("✅ Chat data cleared successfully");
  }
  return next(action);
};

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(clearChatOnLogout), // ✅ Add middleware
});

// Create a persistor for the store
export let persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Check token expiration after rehydration
persistor.subscribe(() => {
  const state = store.getState();
  const { decodedToken } = state.auth;

  if (decodedToken?.exp && decodedToken.exp * 1000 <= Date.now()) {
    store.dispatch(logout());
  }
});
