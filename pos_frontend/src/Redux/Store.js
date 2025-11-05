import { configureStore } from '@reduxjs/toolkit';
import userReducer from './Slices/UserSlice';

const Store = configureStore({
  reducer: {
    user: userReducer,
  },
});

export default Store;
