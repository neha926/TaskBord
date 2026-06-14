import { FolderOpen, CheckCircle, Users, AlertTriangle } from "lucide-react";
import { createElement } from "react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

export default function StatsGrid() {
    const currentWorkspace = useSelector(
        (state) => state?.workspace?.currentWorkspace || null
    );

    const [stats, setStats] = useState({
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        myTasks: 0,
        overdueIssues: 0,
    });

    const statCards = [
        {
            icon: FolderOpen,
            title: "Total Projects",
            value: stats.totalProjects,
            subtitle: `projects in ${currentWorkspace?.name}`,
            bgColor: "bg-blue-500/10",
            textColor: "text-blue-500",
        },
        {
            icon: CheckCircle,
            title: "Completed Projects",
            value: stats.completedProjects,
            subtitle: `of ${stats.totalProjects} total`,
            bgColor: "bg-emerald-500/10",
            textColor: "text-emerald-500",
        },
        {
            icon: Users,
            title: "My Tasks",
            value: stats.myTasks,
            subtitle: "assigned to me",
            bgColor: "bg-purple-500/10",
            textColor: "text-purple-500",
        },
        {
            icon: AlertTriangle,
            title: "Overdue",
            value: stats.overdueIssues,
            subtitle: "need attention",
            bgColor: "bg-amber-500/10",
            textColor: "text-amber-500",
        },
    ];

    useEffect(() => {
        if (currentWorkspace) {
            setStats({
                totalProjects: currentWorkspace.projects.length,
                activeProjects: currentWorkspace.projects.filter(
                    (p) => p.status !== "CANCELLED" && p.status !== "COMPLETED"
                ).length,
                completedProjects: currentWorkspace.projects
                    .filter((p) => p.status === "COMPLETED")
                    .reduce((acc, project) => acc + project.tasks.length, 0),
                myTasks: currentWorkspace.projects.reduce(
                    (acc, project) =>
                        acc +
                        project.tasks.filter(
                            (t) => t.assignee?.email === currentWorkspace.owner.email
                        ).length,
                    0
                ),
                overdueIssues: currentWorkspace.projects.reduce(
                    (acc, project) =>
                        acc + project.tasks.filter((t) => t.due_date < new Date()).length,
                    0
                ),
            });
        }
    }, [currentWorkspace]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-9">
            {statCards.map(
                ({ icon, title, value, subtitle, bgColor, textColor }, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-purple-200 dark:border-purple-500/20 hover:border-purple-400 dark:hover:border-purple-400/60 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 rounded-xl p-6 group cursor-default" >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-lg ${bgColor} bg-opacity-20 transition-transform duration-300 group-hover:scale-110 shadow-sm`} >
                                {createElement(icon, { size: 20, className: textColor })}
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-100 dark:border-emerald-900/30" >
                                <span className="w-3 h-3">↗</span>
                                <span>12%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{title}</p>
                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{value}</h3>
                            {subtitle && (
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
