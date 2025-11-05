import { createSlice } from '@reduxjs/toolkit';
const origin = import.meta.env.VITE_BACKEND_URL;

// Initial state
const initialState = {
    user: null,  // Will store the full user data here
    loading: true, // Start with loading true since we'll fetch on mount
    notificationsLoading: false, // Separate loading state for notifications
    isProfileComplete: false,
};

// User slice for managing user data
const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        // Action to set user info (called after login, for example)
        setUserInfo: (state, action) => {
            if (!action.payload.user) {
                state.user = null;
                return;
            }

            const user = action.payload.user;
            const dummyImageUrl = "https://picsum.photos/100";

            // Check if profile_image is an array or a string
            const profileImage = Array.isArray(user.profile_image)
                ? user.profile_image[0]
                : user.profile_image;

            // Build the profile image URL
            let finalProfileImage = null;
            if (profileImage) {
                finalProfileImage = profileImage.startsWith('http')
                    ? profileImage
                    : `${origin}${profileImage}`;
            }

            // Set the user data with the processed profile image
            state.user = {
                ...user,
                profile_image: finalProfileImage || dummyImageUrl
            };

            // Update loading state
            state.loading = false;
        },
        // Action to set loading to true while fetching user data
        setUserLoading: (state, action) => {
            state.loading = action.payload;
        },
        // Action to set notifications loading state
        setNotificationsLoading: (state, action) => {
            state.notificationsLoading = action.payload;
        },
        // Action to clear user data (called after logout)
        clearUserInfo: (state) => {
            state.user = null;
            state.loading = false;
            state.notificationsLoading = false;
            state.isProfileComplete = false;
        },
    },
});

// Export actions and reducer
export const { 
    setUserInfo, 
    clearUserInfo, 
    setUserLoading,
    setNotificationsLoading 
} = userSlice.actions;
export default userSlice.reducer;
