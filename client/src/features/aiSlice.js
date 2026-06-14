import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../configs/api";
import toast from "react-hot-toast";

export const fetchSmartAgenda = createAsyncThunk('ai/fetchSmartAgenda', async({getToken}, {rejectWithValue}) => {
    try {
        const { data } = await api.get('/api/ai/smart-agenda', {
            headers: { Authorization: `Bearer ${await getToken()}` }
        });
        return data.agenda;
    } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to fetch Smart Agenda");
        return rejectWithValue(error?.response?.data);
    }
});

export const fetchCommentSummary = createAsyncThunk('ai/fetchCommentSummary', async({taskId, getToken}, {rejectWithValue}) => {
    try {
        const { data } = await api.get(`/api/ai/comment-summary/${taskId}`, {
            headers: { Authorization: `Bearer ${await getToken()}` }
        });
        return { taskId, summary: data.summary };
    } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to summarize comments");
        return rejectWithValue(error?.response?.data);
    }
});

const initialState = {
    agenda: null,
    loadingAgenda: false,
    summaries: {}, // mapping taskId to summary text
    loadingSummaries: {} // mapping taskId to boolean
};

const aiSlice = createSlice({
    name: "ai",
    initialState,
    reducers: {
        clearSummaries: (state) => {
            state.summaries = {};
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSmartAgenda.pending, (state) => { state.loadingAgenda = true; })
            .addCase(fetchSmartAgenda.fulfilled, (state, action) => {
                state.loadingAgenda = false;
                state.agenda = action.payload;
            })
            .addCase(fetchSmartAgenda.rejected, (state) => { state.loadingAgenda = false; })
            .addCase(fetchCommentSummary.pending, (state, action) => { 
                state.loadingSummaries[action.meta.arg.taskId] = true; 
            })
            .addCase(fetchCommentSummary.fulfilled, (state, action) => {
                state.loadingSummaries[action.payload.taskId] = false;
                state.summaries[action.payload.taskId] = action.payload.summary;
            })
            .addCase(fetchCommentSummary.rejected, (state, action) => { 
                state.loadingSummaries[action.meta.arg.taskId] = false; 
            });
    }
});

export const { clearSummaries } = aiSlice.actions;
export default aiSlice.reducer;
