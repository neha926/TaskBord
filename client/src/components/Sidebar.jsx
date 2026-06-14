import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import MyTasksSidebar from './MyTasksSidebar'
import ProjectSidebar from './ProjectsSidebar'
import WorkspaceDropdown from './WorkspaceDropdown'
import { FolderOpenIcon, LayoutDashboardIcon, SettingsIcon, UsersIcon } from 'lucide-react'
import { useClerk } from '@clerk/clerk-react'

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
    const {openUserProfile}=useClerk();

    const menuItems = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboardIcon },
        { name: 'Projects', href: '/projects', icon: FolderOpenIcon },
        { name: 'Team', href: '/team', icon: UsersIcon },
    ]

    const sidebarRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setIsSidebarOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setIsSidebarOpen]);

    return (
        <div ref={sidebarRef} className={`z-50 bg-white dark:bg-zinc-900 w-64 flex flex-col h-screen border-r border-gray-200 dark:border-zinc-800 max-sm:absolute transition-all duration-300 ${isSidebarOpen ? 'left-0' : '-left-full'} `} >
            <WorkspaceDropdown />
            
            <div className='flex-1 overflow-y-auto no-scrollbar flex flex-col'>
                <div className='p-4 space-y-1'>
                    {menuItems.map((item) => (
                        <NavLink 
                            to={item.href} 
                            end={item.href === '/'} 
                            key={item.name} 
                            onClick={() => window.innerWidth < 640 && setIsSidebarOpen(false)}
                            className={({ isActive }) => `flex items-center gap-3 py-2 px-4 text-gray-800 dark:text-zinc-100 cursor-pointer rounded transition-all ${isActive ? 'bg-gray-100 dark:bg-zinc-800 dark:bg-gradient-to-br dark:from-zinc-800 dark:to-zinc-800/50 font-medium' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60'}`} 
                        >
                            <item.icon size={18} className={`${item.href === '/' ? 'text-blue-500' : item.href === '/projects' ? 'text-amber-500' : 'text-emerald-500'}`} />
                            <p className='text-sm truncate'>{item.name}</p>
                        </NavLink>
                    ))}
                    <button onClick={openUserProfile} className='flex w-full items-center gap-3 py-2 px-4 text-gray-800 dark:text-zinc-100 cursor-pointer rounded hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-all'>
                        <SettingsIcon size={18} className="text-zinc-500" />
                        <p className='text-sm truncate'>Account Settings</p>
                    </button>
                </div>

                <div className="border-t border-gray-100 dark:border-zinc-800/50 my-2 mx-4" />

                <MyTasksSidebar />
                <ProjectSidebar />
            </div>
        </div>
    )
}

export default Sidebar
