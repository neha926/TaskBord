import { configureStore } from '@reduxjs/toolkit'
import workspaceReducer from '../features/workspaceSlice'
import themeReducer from '../features/themeSlice'
import aiReducer from '../features/aiSlice'

export const store = configureStore({
    reducer: {
        workspace: workspaceReducer,
        theme: themeReducer,
        ai: aiReducer,
    },
})