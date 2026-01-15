import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Role = 'admin' | 'project_manager' | 'member';

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  first_name?: string;
  last_name?: string;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isInitialized: boolean;
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'curiouspmo_access_token',
  REFRESH_TOKEN: 'curiouspmo_refresh_token',
  USER: 'curiouspmo_user',
};

// Load initial state from localStorage
const loadFromStorage = (): Partial<AuthState> => {
  try {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    const user = userStr ? JSON.parse(userStr) : null;
    return { accessToken, refreshToken, user };
  } catch {
    return {};
  }
};

// Save to localStorage
const saveToStorage = (state: AuthState) => {
  try {
    if (state.accessToken) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, state.accessToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    }
    if (state.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, state.refreshToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }
    if (state.user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(state.user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  } catch {
    // Ignore storage errors
  }
};

// Clear localStorage
const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  } catch {
    // Ignore storage errors
  }
};

const storedState = loadFromStorage();

const initialState: AuthState = {
  accessToken: storedState.accessToken ?? null,
  refreshToken: storedState.refreshToken ?? null,
  user: storedState.user ?? null,
  isInitialized: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens: (
      state,
      action: PayloadAction<{ access: string; refresh?: string }>,
    ) => {
      state.accessToken = action.payload.access;
      state.refreshToken = action.payload.refresh ?? state.refreshToken;
      saveToStorage(state);
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      saveToStorage(state);
    },
    logout: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      clearStorage();
    },
    initializeAuth: (state) => {
      state.isInitialized = true;
    },
  },
});

export const { setTokens, setUser, logout, initializeAuth } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  !!state.auth.accessToken;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAccessToken = (state: { auth: AuthState }) =>
  state.auth.accessToken;
