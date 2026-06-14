import { format } from "date-fns";
import toast from "react-hot-toast";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CalendarIcon, MessageCircle, PenIcon, Trash2 } from "lucide-react";
import { useAuth, useUser } from "@clerk/clerk-react";
import api from "../configs/api";
import { fetchWorkspaces } from "../features/workspaceSlice";
import { fetchCommentSummary } from "../features/aiSlice";
import { Loader2, Sparkles } from "lucide-react";

const TaskDetails = () => {

    const [searchParams] = useSearchParams();
    const projectId = searchParams.get("projectId");
    const taskId = searchParams.get("taskId");

    const { getToken } = useAuth();
    const { user } = useUser();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    const [task, setTask] = useState(null);
    const [project, setProject] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);

    const { currentWorkspace } = useSelector((state) => state.workspace);
    const { summaries, loadingSummaries } = useSelector((state) => state.ai);

    const handleStatusChange = async (newStatus) => {
        try {
            toast.loading("Updating status...");
            const token = await getToken();

            await api.put(`/api/tasks/${taskId}`, { status: newStatus }, { 
                headers: { Authorization: `Bearer ${token}` } 
            });

            setTask(prev => ({ ...prev, status: newStatus }));
            
            // Also update in workspace store if needed, but for now local state is fine for this view
            toast.dismissAll();
            toast.success("Task status updated successfully");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.message || error.message);
        }
    };

    const handleSummarize = async () => {
        if (!taskId) return;
        const token = await getToken();
        dispatch(fetchCommentSummary({ taskId, getToken: () => token }));
    };

    const fetchComments = useCallback(async () => {
        if (!taskId) return;
        try {
            const token = await getToken();
            const { data } = await api.get(`/api/comments/${taskId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setComments(data.comments || []);
        } catch (error) {
            console.error("Error fetching comments:", error);
        }
    }, [taskId, getToken]);

    const fetchTaskDetails = useCallback(async () => {
        setLoading(true);
        if (!projectId || !taskId || !currentWorkspace) return;

        const proj = currentWorkspace.projects.find((p) => p.id === projectId);
        if (!proj) {
            setLoading(false);
            return;
        }

        const tsk = proj.tasks.find((t) => t.id === taskId);
        if (!tsk) {
            setLoading(false);
            return;
        }

        setTask(tsk);
        setProject(proj);
        setLoading(false);
    }, [projectId, taskId, currentWorkspace]);

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        try {
            toast.loading("Adding comment...");
            const token = await getToken();
            
            const { data } = await api.post('/api/comments', {
                content: newComment,
                taskId: taskId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setComments((prev) => [...prev, data.comment]);
            setNewComment("");
            toast.dismissAll();
            toast.success("Comment added.");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.message || error.message);
            console.error(error);
        }
    };

    const handleDeleteTask = async () => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;

        try {
            toast.loading("Deleting task...");
            const token = await getToken();
            await api.delete(`/api/tasks/${taskId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.dismissAll();
            toast.success("Task deleted successfully.");
            
            // Refresh workspace data to update UI
            await dispatch(fetchWorkspaces({ getToken }));
            
            // Go back to project details
            navigate(`/projectsDetail?id=${projectId}&tab=tasks`);
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.message || error.message);
            console.error(error);
        }
    };

    useEffect(() => { 
        fetchTaskDetails(); 
    }, [fetchTaskDetails]);

    useEffect(() => {
        if (taskId && task) {
            fetchComments();
            const interval = setInterval(() => { fetchComments(); }, 5000);
            return () => clearInterval(interval);
        }
    }, [taskId, task, fetchComments]);

    if (loading) return <div className="text-gray-500 dark:text-zinc-400 px-4 py-6 text-center mt-20">Loading task details...</div>;
    if (!task) return <div className="text-red-500 px-4 py-6 text-center mt-20">Task not found.</div>;

    return (
        <div className="flex flex-col-reverse lg:flex-row gap-6 sm:p-4 text-gray-900 dark:text-zinc-100 max-w-6xl mx-auto">
            {/* Left: Comments / Chatbox */}
            <div className="w-full lg:w-2/3">
                <div className="p-5 rounded-md  border border-gray-300 dark:border-zinc-800  flex flex-col lg:h-[80vh]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <h2 className="text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                            <MessageCircle className="size-5" /> Task Discussion ({comments.length})
                        </h2>
                        {comments.length > 0 && (
                            <button
                                onClick={handleSummarize}
                                disabled={loadingSummaries[taskId]}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800 transition-colors self-start sm:self-auto"
                            >
                                {loadingSummaries[taskId] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Summarize Context
                            </button>
                        )}
                    </div>

                    {summaries[taskId] && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm text-indigo-900 dark:text-indigo-200 shadow-sm leading-relaxed whitespace-pre-wrap">
                            <strong className="flex items-center gap-1.5 mb-2 text-indigo-700 dark:text-indigo-300 font-semibold text-base"><Sparkles className="w-4 h-4"/> AI Summary</strong>
                            {typeof summaries[taskId] === 'string' ? summaries[taskId].replace(/\*\*/g, '') : JSON.stringify(summaries[taskId])}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto no-scrollbar mb-4 pr-2">
                        {comments.length > 0 ? (
                            <div className="flex flex-col gap-4 mb-6">
                                {comments.map((comment) => (
                                    <div key={comment.id} className={`max-w-[85%] dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-3 rounded-lg shadow-sm ${comment.userId === user?.id ? "ml-auto bg-blue-50/50 border-blue-100 dark:border-blue-900/30" : "mr-auto bg-white"}`} >
                                        <div className="flex items-center gap-2 mb-1 text-xs">
                                            <div className="size-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-400">
                                                {comment.user?.name?.charAt(0) || comment.user?.email?.charAt(0) || "?"}
                                            </div>
                                            <span className="font-semibold text-gray-900 dark:text-zinc-200">
                                                {comment.userId === user?.id ? "You" : (comment.user?.name || comment.user?.email || "User")}
                                            </span>
                                            <span className="text-gray-400 dark:text-zinc-500">
                                                • {format(new Date(comment.createdAt), "dd MMM, HH:mm")}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-800 dark:text-zinc-300 whitespace-pre-wrap">{comment.content}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-zinc-600">
                                <MessageCircle className="size-12 mb-2 opacity-20" />
                                <p className="text-sm">No comments yet. Start the discussion!</p>
                            </div>
                        )}
                    </div>

                    {/* Add Comment */}
                    <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-zinc-800">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment();
                                }
                            }}
                            placeholder="Write a comment..."
                            className="flex-1 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            rows={2}
                        />
                        <button 
                            onClick={handleAddComment} 
                            disabled={!newComment.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all text-white text-sm font-medium px-6 rounded-lg self-end h-[44px]" 
                        >
                            Post
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Task + Project Info */}
            <div className="w-full lg:w-1/2 flex flex-col gap-6">
                {/* Task Info */}
                <div className="p-5 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 relative group">
                    <button 
                        onClick={handleDeleteTask}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Task"
                    >
                        <Trash2 className="size-4" />
                    </button>

                    <div className="mb-3 pr-8">
                        <h1 className="text-lg font-medium text-gray-900 dark:text-zinc-100">{task.title}</h1>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <select 
                                value={task.status} 
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="TODO" className="bg-white dark:bg-zinc-800">TODO</option>
                                <option value="IN_PROGRESS" className="bg-white dark:bg-zinc-800">IN PROGRESS</option>
                                <option value="DONE" className="bg-white dark:bg-zinc-800">DONE</option>
                            </select>
                            <span className="px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-300 text-xs uppercase">
                                {task.type}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-green-200 dark:bg-emerald-900 text-green-900 dark:text-emerald-300 text-xs uppercase">
                                {task.priority}
                            </span>
                        </div>
                    </div>

                    {task.description && (
                        <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed mb-4">{task.description}</p>
                    )}

                    <hr className="border-zinc-200 dark:border-zinc-700 my-3" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-zinc-300">
                        <div className="flex items-center gap-2">
                            <img src={task.assignee?.image} className="size-5 rounded-full" alt="avatar" />
                            {task.assignee?.name || "Unassigned"}
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="size-4 text-gray-500 dark:text-zinc-500" />
                            Due : {format(new Date(task.due_date), "dd MMM yyyy")}
                        </div>
                    </div>
                </div>

                {/* Project Info */}
                {project && (
                    <div className="p-4 rounded-md bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-gray-300 dark:border-zinc-800 ">
                        <p className="text-xl font-medium mb-4">Project Details</p>
                        <h2 className="text-gray-900 dark:text-zinc-100 flex items-center gap-2"> <PenIcon className="size-4" /> {project.name}</h2>
                        <p className="text-xs mt-3">Project Start Date: {format(new Date(project.start_date), "dd MMM yyyy")}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-zinc-400 mt-3">
                            <span>Status: {project.status}</span>
                            <span>Priority: {project.priority}</span>
                            <span>Progress: {project.progress}%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskDetails;
