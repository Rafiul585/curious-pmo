import { createSlice } from '@reduxjs/toolkit';
const initialState = {
    theme: 'light',
};
const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setTheme: (state, action) => {
            state.theme = action.payload;
        },
        toggleTheme: (state) => {
            state.theme = state.theme === 'light' ? 'dark' : 'light';
        },
    },
});
export const { setTheme, toggleTheme } = uiSlice.actions;
export default uiSlice.reducer;
