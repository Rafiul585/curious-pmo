import { createSlice } from '@reduxjs/toolkit';
// Get initial theme from localStorage or default to 'light'
const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('themeMode');
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
            return saved;
        }
    }
    return 'light';
};
const initialState = {
    mode: getInitialTheme(),
};
const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        setThemeMode: (state, action) => {
            state.mode = action.payload;
            // Persist to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('themeMode', action.payload);
            }
        },
        toggleTheme: (state) => {
            state.mode = state.mode === 'light' ? 'dark' : 'light';
            if (typeof window !== 'undefined') {
                localStorage.setItem('themeMode', state.mode);
            }
        },
    },
});
export const { setThemeMode, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
