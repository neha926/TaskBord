import { createSlice, createAsyncThunk} from "@reduxjs/toolkit";
import api from "../configs/api";
import toast from "react-hot-toast";

export const fetchWorkspaces = createAsyncThunk('workspace/fetchworkspaces', async({getToken})=>{
    try {
        const{data}= await api.get('/api/workspaces',{headers: {
            Authorization:`Bearer ${await getToken()}`}})
            return data.workspaces || []
        
    } catch (error) {
        console.log(error?.response?.data?.message || error.message);
        return []
    }
})

// Silent fetch for real-time polling without loading spinner
export const refreshWorkspaces = createAsyncThunk('workspace/refreshWorkspaces', async({getToken})=>{
    try {
        const{data}= await api.get('/api/workspaces',{headers: {
            Authorization:`Bearer ${await getToken()}`}})
            return data.workspaces || []
        
    } catch (error) {
        console.log(error?.response?.data?.message || error.message);
        return []
    }
})

export const deleteWorkspaceThunk = createAsyncThunk('workspace/deleteWorkspace', async({id, getToken}, {dispatch})=>{
    try {
        const{data}= await api.delete(`/api/workspaces/${id}`,{headers: {
            Authorization:`Bearer ${await getToken()}`}})
            dispatch(deleteWorkspace(id));
            toast.success(data.message);
            return id;
    } catch (error) {
        toast.error(error?.response?.data?.message || error.message);
        throw error;
    }
})


const initialState = {
    workspaces: [],
    currentWorkspace: null,
    loading: false,
};

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setWorkspaces: (state, action) => {
            state.workspaces = action.payload;
        },
        setCurrentWorkspace: (state, action) => {
            localStorage.setItem("currentWorkspaceId", action.payload);
            state.currentWorkspace = state.workspaces.find((w) => w.id === action.payload);
        },
        addWorkspace: (state, action) => {
            state.workspaces.push(action.payload);

            // set current workspace to the new workspace
            if (state.currentWorkspace?.id !== action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        updateWorkspace: (state, action) => {
            state.workspaces = state.workspaces.map((w) =>
                w.id === action.payload.id ? action.payload : w
            );

            // if current workspace is updated, set it to the updated workspace
            if (state.currentWorkspace?.id === action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        deleteWorkspace: (state, action) => {
            state.workspaces = state.workspaces.filter((w) => w.id !== action.payload);
        },
        addProject: (state, action) => {
            state.currentWorkspace.projects.push(action.payload);
            // find workspace by id and add project to it
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? { ...w, projects: w.projects.concat(action.payload) } : w
            );
        },
        addTask: (state, action) => {

            state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                console.log(p.id, action.payload.projectId, p.id === action.payload.projectId);
                if (p.id === action.payload.projectId) {
                    p.tasks.push(action.payload);
                }
                return p;
            });

            // find workspace and project by id and add task to it
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? { ...p, tasks: p.tasks.concat(action.payload) } : p
                    )
                } : w
            );
        },
        updateTask: (state, action) => {
            state.currentWorkspace.projects.map((p) => {
                if (p.id === action.payload.projectId) {
                    p.tasks = p.tasks.map((t) =>
                        t.id === action.payload.id ? action.payload : t
                    );
                }
            });
            // find workspace and project by id and update task in it
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace.id ? {
                    ...w, projects: w.projects.map((p) =>
                        p.id === action.payload.projectId ? {
                            ...p, tasks: p.tasks.map((t) =>
                                t.id === action.payload.id ? action.payload : t
                            )
                        } : p
                    )
                } : w
            );
        },
        deleteTask: (state, action) => {
            const idsToDelete = Array.isArray(action.payload) ? action.payload : [action.payload];
            // remove from current workspace projects
            state.currentWorkspace.projects.forEach((p) => {
                p.tasks = p.tasks.filter((t) => !idsToDelete.includes(t.id));
            });
            // remove from workspaces list for the current workspace
            state.workspaces = state.workspaces.map((w) => {
                if (w.id !== state.currentWorkspace.id) return w;
                return {
                    ...w,
                    projects: w.projects.map((p) => ({
                        ...p,
                        tasks: p.tasks.filter((t) => !idsToDelete.includes(t.id)),
                    })),
                };
            });
        }

    },
    extraReducers: (builder)=>{
        builder.addCase(fetchWorkspaces.pending, (state)=>{
            state.loading=true
        });
        builder.addCase(fetchWorkspaces.fulfilled, (state,action)=>{
            state.workspaces=action.payload;
            if(action.payload.length>0){
                const localStroageCurrentWorkspaceId = localStorage.getItem('currentWorkspaceId');
                if(localStroageCurrentWorkspaceId){
                    const findWorkspace = action.payload.find((w)=> w.id === localStroageCurrentWorkspaceId);
                    if(findWorkspace){
                        state.currentWorkspace=findWorkspace
                    }else {
                         state.currentWorkspace=action.payload[0]
                    }
                }else{
                    state.currentWorkspace = action.payload[0]
                }
            }
            state.loading = false;
        })
        builder.addCase(fetchWorkspaces.rejected, (state)=>{
            state.loading=false;
        });

        builder.addCase(refreshWorkspaces.fulfilled, (state,action)=>{
            state.workspaces=action.payload;
            if(action.payload.length>0){
                const localStroageCurrentWorkspaceId = localStorage.getItem('currentWorkspaceId');
                if(localStroageCurrentWorkspaceId){
                    const findWorkspace = action.payload.find((w)=> w.id === localStroageCurrentWorkspaceId);
                    if(findWorkspace){
                        state.currentWorkspace=findWorkspace
                    }else {
                         state.currentWorkspace=action.payload[0]
                    }
                }else{
                    state.currentWorkspace = action.payload[0]
                }
            }
        });

    }
});

export const { setWorkspaces, setCurrentWorkspace, addWorkspace, updateWorkspace, deleteWorkspace, addProject, addTask, updateTask, deleteTask } = workspaceSlice.actions;
export default workspaceSlice.reducer;
