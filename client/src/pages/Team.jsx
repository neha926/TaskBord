import { useEffect, useState } from "react";
import { UsersIcon, Search, UserPlus, Shield, Activity, BarChart3, X } from "lucide-react";
import InviteMemberDialog from "../components/InviteMemberDialog";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { useAuth, useUser } from "@clerk/clerk-react";
import { fetchWorkspaces } from "../features/workspaceSlice";
import { RotateCcw } from "lucide-react";
import api from "../configs/api";

const Team = () => {

    const [tasks, setTasks] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [performanceData, setPerformanceData] = useState(null);
    const [loadingPerformance, setLoadingPerformance] = useState(false);
    
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);
    const projects = currentWorkspace?.projects || [];
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const { user: currentUser } = useUser();

    const isAdmin = currentWorkspace?.members?.find(m => m.userId === currentUser?.id)?.role === "ADMIN" || currentWorkspace?.ownerId === currentUser?.id;

    const fetchPerformance = async (employeeId) => {
        setLoadingPerformance(true);
        setSelectedEmployee(employeeId);
        try {
            const token = await getToken();
            const response = await api.get(`/api/users/performance/${employeeId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPerformanceData(response.data);
        } catch (error) {
            console.error("Error fetching performance:", error);
            toast.error(error.response?.data?.message || "Failed to fetch performance");
        } finally {
            setLoadingPerformance(false);
        }
    };

    const filteredUsers = users.filter(
        (user) =>
            user?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        setUsers(currentWorkspace?.members || []);
        setTasks(currentWorkspace?.projects?.reduce((acc, project) => [...acc, ...project.tasks], []) || []);
    }, [currentWorkspace]);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">Team</h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm">
                        Manage team members and their contributions
                    </p>
                </div>
                <div className="flex items-center gap-2">
                <button onClick={async () => { await dispatch(fetchWorkspaces({ getToken })); }} className="flex items-center px-3 py-2 rounded text-sm border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-white transition" >
                    <RotateCcw className="w-4 h-4 mr-2" /> Refresh
                </button>
                <button onClick={() => setIsDialogOpen(true)} className="flex items-center px-5 py-2 rounded text-sm bg-gradient-to-br from-blue-500 to-blue-600 hover:opacity-90 text-white transition" >
                    <UserPlus className="w-4 h-4 mr-2" /> Invite Member
                </button>
                </div>
                <InviteMemberDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
            </div>

            {/* Stats Cards */}
            <div className="flex flex-wrap gap-4">
                {/* Total Members */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Total Members</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{users.length}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/10">
                            <UsersIcon className="size-4 text-blue-500 dark:text-blue-200" />
                        </div>
                    </div>
                </div>

                {/* Active Projects */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Active Projects</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {projects.filter((p) => p.status !== "CANCELLED" && p.status !== "COMPLETED").length}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/10">
                            <Activity className="size-4 text-emerald-500 dark:text-emerald-200" />
                        </div>
                    </div>
                </div>

                {/* Total Tasks */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Total Tasks</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{tasks.length}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/10">
                            <Shield className="size-4 text-purple-500 dark:text-purple-200" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3" />
                <input placeholder="Search team members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 w-full text-sm rounded-md border border-gray-300 dark:border-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 py-2 focus:outline-none focus:border-blue-500" />
            </div>

            {/* Team Members */}
            <div className="w-full">
                {filteredUsers.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <UsersIcon className="w-12 h-12 text-gray-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {users.length === 0
                                ? "No team members yet"
                                : "No members match your search"}
                        </h3>
                        <p className="text-gray-500 dark:text-zinc-400 mb-6">
                            {users.length === 0
                                ? "Invite team members to start collaborating"
                                : "Try adjusting your search term"}
                        </p>
                    </div>
                ) : (
                    <div className="max-w-4xl w-full">
                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto rounded-md border border-gray-200 dark:border-zinc-800">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-gray-50 dark:bg-zinc-900/50">
                                    <tr>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">
                                            Name
                                        </th>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">
                                            Email
                                        </th>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">
                                            Role
                                        </th>
                                        {isAdmin && (
                                            <th className="px-6 py-2.5 text-left font-medium text-sm">
                                                Performance
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                                    {filteredUsers.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                                        >
                                            <td className="px-6 py-2.5 whitespace-nowrap flex items-center gap-3">
                                                <img
                                                    src={user.user.image}
                                                    alt={user.user.name}
                                                    className="size-7 rounded-full bg-gray-200 dark:bg-zinc-800"
                                                />
                                                <span className="text-sm text-zinc-800 dark:text-white truncate">
                                                    {user.user?.name || "Unknown User"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-400">
                                                {user.user.email}
                                            </td>
                                            <td className="px-6 py-2.5 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 text-xs rounded-md ${user.role === "ADMIN"
                                                            ? "bg-purple-100 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400"
                                                            : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                                                        }`}
                                                >
                                                    {user.role || "User"}
                                                </span>
                                            </td>
                                            {isAdmin && (
                                                <td className="px-6 py-2.5 whitespace-nowrap">
                                                    <button 
                                                        onClick={() => fetchPerformance(user.userId)}
                                                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-blue-500 transition-colors"
                                                        title="View Performance"
                                                    >
                                                        <BarChart3 size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="sm:hidden space-y-3">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="p-4 border border-gray-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <img
                                            src={user.user.image}
                                            alt={user.user.name}
                                            className="size-9 rounded-full bg-gray-200 dark:bg-zinc-800"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {user.user?.name || "Unknown User"}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-zinc-400">
                                                {user.user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <span
                                            className={`px-2 py-1 text-xs rounded-md ${user.role === "ADMIN"
                                                    ? "bg-purple-100 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400"
                                                    : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                                                }`}
                                        >
                                            {user.role || "User"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Performance Modal */}
            {selectedEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Performance</h2>
                                    <p className="text-gray-500 dark:text-zinc-400">Detailed productivity analytics</p>
                                </div>
                                <button 
                                    onClick={() => { setSelectedEmployee(null); setPerformanceData(null); }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {loadingPerformance ? (
                                <div className="py-20 flex justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                </div>
                            ) : performanceData ? (
                                <div className="space-y-8">
                                    {/* Score Card */}
                                    <div className="flex items-center gap-6 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                                        <div className="relative size-24 flex items-center justify-center">
                                            <svg className="size-full" viewBox="0 0 36 36">
                                                <path
                                                    className="text-gray-200 dark:text-zinc-800"
                                                    strokeDasharray="100, 100"
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none" strokeWidth="3"
                                                />
                                                <path
                                                    className="text-blue-500"
                                                    strokeDasharray={`${performanceData.analytics.score}, 100`}
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none" strokeWidth="3" strokeLinecap="round"
                                                />
                                            </svg>
                                            <span className="absolute text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                {performanceData.analytics.score}%
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{performanceData.employee.name}</h3>
                                            <p className="text-gray-600 dark:text-zinc-400">Performance Index</p>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                                            <p className="text-sm text-gray-500 dark:text-zinc-500 mb-1">Completed</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{performanceData.analytics.completedTasks}</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                                            <p className="text-sm text-gray-500 dark:text-zinc-500 mb-1">Reopened</p>
                                            <p className="text-2xl font-bold text-red-500">{performanceData.analytics.reopenedCount}</p>
                                        </div>
                                    </div>

                                    {/* Time Analytics */}
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-gray-900 dark:text-white">Timeliness</h4>
                                        <div className="flex gap-4 items-center">
                                            <div className="flex-1 h-3 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                                                <div 
                                                    className="h-full bg-emerald-500" 
                                                    style={{ width: `${(performanceData.analytics.onTime / performanceData.analytics.completedTasks) * 100 || 0}%` }}
                                                />
                                                <div 
                                                    className="h-full bg-orange-500" 
                                                    style={{ width: `${(performanceData.analytics.late / performanceData.analytics.completedTasks) * 100 || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">On-Time: {performanceData.analytics.onTime}</span>
                                            <span className="text-orange-600 dark:text-orange-400 font-medium">Late: {performanceData.analytics.late}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 text-center text-gray-500">No data available.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Team;
