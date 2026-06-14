import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { Loader2Icon, X, Sparkles } from 'lucide-react'
import { useUser, SignIn, useAuth } from '@clerk/clerk-react'
import { fetchWorkspaces, refreshWorkspaces } from '../features/workspaceSlice'
import api from '../configs/api'
import AIPortfolioOnboarding from '../components/AIPortfolioOnboarding'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [showProfilePrompt, setShowProfilePrompt] = useState(false)
    const [showAIOnboarding, setShowAIOnboarding] = useState(false)
    const [profileData, setProfileData] = useState({ bio: '', skills: '', organization: '' })
    const { loading, workspaces } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const {user, isLoaded} = useUser()
    const {getToken} = useAuth()
    const navigate = useNavigate()

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [])

    // Initial Loading Workspace and Profile Check
    useEffect(()=>{
        if(isLoaded && user){
            if (workspaces.length === 0) {
                dispatch(fetchWorkspaces({getToken}))
            }
            checkProfileStatus()

            // Polling to keep state fresh across accounts (every 5 seconds)
            const interval = setInterval(() => {
                dispatch(refreshWorkspaces({getToken}))
            }, 5000);

            return () => clearInterval(interval);
        }
    },[user,isLoaded])

    const checkProfileStatus = async () => {
        try {
            const token = await getToken();
            const response = await api.get('/api/users/profile', {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!response.data.user.profileCompleted) {
                // Check if they dismissed it in this session
                const dismissed = sessionStorage.getItem('profilePromptDismissed')
                if (!dismissed) {
                    setShowProfilePrompt(true)
                }
            }
        } catch (error) {
            console.error("Error checking profile status:", error)
        }
    }

    const handleProfileSubmit = async (e) => {
        e.preventDefault()
        try {
            const token = await getToken();
            await api.put('/api/users/profile', { ...profileData, profileCompleted: true }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setShowProfilePrompt(false)
        } catch (error) {
            console.error("Error updating profile:", error)
        }
    }

    const handleSkip = () => {
        setShowProfilePrompt(false)
        sessionStorage.setItem('profilePromptDismissed', 'true')
    }
 
    if(!user){
        return(
            <div className='flex justify-center items-center h-screen bg-white dark:bg-zinc-950'>
                <SignIn/>
            </div>
        )
    }

    if (loading) return (
        <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
            <Loader2Icon className="size-7 text-blue-500 animate-spin" />
        </div>
    )
     
    // if(user && workspaces.length === 0 ){
    //     return(
    //         <div className='min-h-screen flex justify-center items-center'>
    //             <CreateOrganization/>
    //         </div>
    //     )
    // }

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>

            {/* Profile Setup Prompt Modal */}
            {showProfilePrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-zinc-800 overflow-hidden">
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Complete Your Profile</h2>
                                <button onClick={handleSkip} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200">
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Help your team know you better by filling in these details.</p>
                            
                            <form onSubmit={handleProfileSubmit} className="space-y-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-600 rounded-lg text-white">
                                            <Sparkles size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-blue-900 dark:text-blue-300">Quick Setup with AI</p>
                                            <p className="text-[10px] text-blue-600 dark:text-blue-400">Build portfolio in seconds</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setShowAIOnboarding(true)}
                                        className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition"
                                    >
                                        Start AI Chat
                                    </button>
                                </div>

                                <div className="relative py-2 flex items-center">
                                    <div className="flex-grow border-t border-gray-100 dark:border-zinc-800"></div>
                                    <span className="flex-shrink mx-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Or manual</span>
                                    <div className="flex-grow border-t border-gray-100 dark:border-zinc-800"></div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Organization Name</label>
                                    <input 
                                        type="text"
                                        required
                                        placeholder="E.g. Acme Corp"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        value={profileData.organization}
                                        onChange={(e) => setProfileData({...profileData, organization: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Skills</label>
                                    <input 
                                        type="text"
                                        required
                                        placeholder="E.g. React, Python, UI Design"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        value={profileData.skills}
                                        onChange={(e) => setProfileData({...profileData, skills: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Bio</label>
                                    <textarea 
                                        rows={3}
                                        placeholder="A short description about yourself..."
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                                        value={profileData.bio}
                                        onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                                    />
                                </div>
                                
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        type="button" 
                                        onClick={handleSkip}
                                        className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
                                    >
                                        Skip for now
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                                    >
                                        Save & Continue
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
             )}

             {showAIOnboarding && (
                 <AIPortfolioOnboarding 
                     onClose={() => setShowAIOnboarding(false)} 
                     onComplete={() => {
                        setShowAIOnboarding(false);
                        setShowProfilePrompt(false);
                        toast.success("Portfolio built successfully!");
                        navigate('/profile');
                     }}
                 />
             )}
         </div>
    )
}

export default Layout