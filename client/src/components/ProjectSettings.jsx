import { format } from "date-fns";
import { Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import AddProjectMember from "./AddProjectMember";
import { useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { fetchWorkspaces } from "../features/workspaceSlice";
import api from "../configs/api";

export default function ProjectSettings({ project }) {

    const dispatch=useDispatch();
    const {getToken}=useAuth();

    const toDate = (val) => {
        if (!val) return null;
        const d = val instanceof Date ? val : new Date(val);
        return isNaN(d.getTime()) ? null : d;
    };

    const formatDate = (val) => {
        const d = toDate(val);
        if (!d) return "";
        try {
            return format(d, "yyyy-MM-dd");
        } catch (e) {
            return "";
        }
    };

    const [formData, setFormData] = useState({
        id: "",
        name: "",
        description: "",
        status: "PLANNING",
        priority: "MEDIUM",
        start_date: null,
        end_date: null,
        progress: 0,
        workspaceId: ""
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.id) {
            toast.error("Project ID is missing. Cannot update.");
            return;
        }

        setIsSubmitting(true);
        toast.loading("Saving changes...");
        try {
            const token = await getToken();
            const { data } = await api.put('/api/projects/', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.dismissAll();
            toast.success(data.message || "Project updated successfully");
            dispatch(fetchWorkspaces({ getToken }));
        } catch (error) {
            toast.dismissAll();
            console.error("Update project error:", error);
            toast.error(error?.response?.data?.message || error.message || "An error occurred while saving.");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (project) {
            setFormData({
                ...project,
                start_date: project.start_date ? new Date(project.start_date) : null,
                end_date: project.end_date ? new Date(project.end_date) : null,
            });
        }
    }, [project]);

    const inputClasses = "w-full px-3 py-2 rounded mt-2 border text-sm dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all";

    const cardClasses = "rounded-lg border p-6 not-dark:bg-white dark:bg-zinc-900/40 border-zinc-300 dark:border-zinc-800 shadow-sm";

    const labelClasses = "text-sm font-medium text-zinc-600 dark:text-zinc-400";

    const members = project?.members || [];

    return (
        <div className="grid lg:grid-cols-2 gap-8 pb-10">
            {/* Project Details */}
            <div className={cardClasses}>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-200 mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-2">General Settings</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name */}
                    <div className="space-y-1">
                        <label className={labelClasses}>Project Name</label>
                        <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClasses} required placeholder="Enter project name" />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className={labelClasses}>Description</label>
                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={inputClasses + " h-28 resize-none"} placeholder="What is this project about?" />
                    </div>

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={labelClasses}>Status</label>
                            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={inputClasses} >
                                <option value="PLANNING" className="bg-white dark:bg-zinc-900">Planning</option>
                                <option value="ACTIVE" className="bg-white dark:bg-zinc-900">Active</option>
                                <option value="ON_HOLD" className="bg-white dark:bg-zinc-900">On Hold</option>
                                <option value="COMPLETED" className="bg-white dark:bg-zinc-900">Completed</option>
                                <option value="CANCELLED" className="bg-white dark:bg-zinc-900">Cancelled</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className={labelClasses}>Priority</label>
                            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className={inputClasses} >
                                <option value="LOW" className="bg-white dark:bg-zinc-900">Low</option>
                                <option value="MEDIUM" className="bg-white dark:bg-zinc-900">Medium</option>
                                <option value="HIGH" className="bg-white dark:bg-zinc-900">High</option>
                            </select>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={labelClasses}>Start Date</label>
                            <input type="date" value={formatDate(formData.start_date)} onChange={(e) => setFormData({ ...formData, start_date: e.target.value ? new Date(e.target.value) : null })} className={inputClasses} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClasses}>End Date</label>
                            <input type="date" value={formatDate(formData.end_date)} onChange={(e) => setFormData({ ...formData, end_date: e.target.value ? new Date(e.target.value) : null })} className={inputClasses} />
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-3 pt-2">
                        <div className="flex justify-between">
                            <label className={labelClasses}>Project Progress</label>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formData.progress}%</span>
                        </div>
                        <input type="range" min="0" max="100" step="5" value={formData.progress} onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })} className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>

                    {/* Save Button */}
                    <div className="pt-4 flex justify-end">
                        <button type="submit" disabled={isSubmitting} className="flex items-center text-sm font-medium justify-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-70" >
                            {isSubmitting ? (
                                <>Saving...</>
                            ) : (
                                <><Save className="size-4" /> Save Changes</>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Team Members */}
            <div className="space-y-6">
                <div className={cardClasses}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-200">
                            Team Members <span className="text-sm font-normal text-zinc-500 ml-2">({members.length})</span>
                        </h2>
                        <button type="button" onClick={() => setIsDialogOpen(true)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors" title="Add Team Member" >
                            <Plus className="size-5 text-zinc-600 dark:text-zinc-400" />
                        </button>
                    </div>
                    
                    <AddProjectMember isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />

                    {/* Member List */}
                    {members.length > 0 ? (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {members.map((member, index) => (
                                <div key={member?.user?.id || index} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/80 transition-all hover:border-blue-200 dark:hover:border-blue-900/50" >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs uppercase">
                                            {member?.user?.email?.charAt(0) || "?"}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate max-w-[150px]">
                                                {member?.user?.email || "Unknown Member"}
                                            </p>
                                        </div>
                                    </div>
                                    {project.team_lead === member?.user?.id && (
                                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                                            Lead
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-zinc-500">
                            <p className="text-sm">No team members yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
