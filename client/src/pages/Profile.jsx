import React, { useState, useEffect } from 'react';
import api from '../configs/api';
import { useSelector } from 'react-redux';
import { User, Briefcase, Code, Building, TrendingUp, BarChart2, GraduationCap, Award, Globe, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@clerk/clerk-react';

import AIPortfolioOnboarding from '../components/AIPortfolioOnboarding';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState([]);
    const [performanceAnalytics, setPerformanceAnalytics] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showAIOnboarding, setShowAIOnboarding] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        image: "",
        bio:"" ,
        skills: "",
        organization:"",
        achievements: "",
        experience: [],
        education: [],
        projects_info: []
    });
    const { theme } = useSelector(state => state.theme);
    const { getToken } = useAuth();

    useEffect(() => {
        if (getToken) {
            fetchProfile();
            fetchAnalytics();
        }
    }, [getToken]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const response = await api.get('/api/users/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(response.data.user);
            setPerformanceAnalytics(response.data.analytics);
            setFormData({
                name: response.data.user.name || '',
                bio: response.data.user.bio || '',
                skills: response.data.user.skills || '',
                organization: response.data.user.organization || '',
                achievements: response.data.user.achievements || '',
                experience: response.data.user.experience || [],
                education: response.data.user.education || [],
                projects_info: response.data.user.projects_info || []
            });
        } catch (error) {
            console.error("Error fetching profile:", error);
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const token = await getToken();
            const response = await api.get('/api/users/analytics', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnalytics(response.data.analytics);
        } catch (error) {
            console.error("Error fetching analytics:", error);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const token = await getToken();
            
            toast.loading("Updating profile...");

            // 1. Prepare data for Direct Update
            const profilePayload = {
                name: formData.name,
                organization: formData.organization,
                bio: formData.bio,
                skills: formData.skills,
                achievements: formData.achievements,
                profileCompleted: true,
                experience: formData.experience,
                education: formData.education,
                projects_info: formData.projects_info
            };

            // 2. Perform Direct Update
            await api.put('/api/users/profile', profilePayload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // 3. Process AI-structured fields separately
            const aiData = `
                Experience: ${formData.experience}
                Education: ${formData.education}
                Projects: ${formData.projects_info}
            `;

            try {
                // AI call is wrapped in its own try-catch so it doesn't fail the whole operation
                await api.post('/api/users/onboarding/parse', { userInput: aiData }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (aiErr) {
                console.warn("AI parsing skipped or failed:", aiErr.message);
            }

            toast.dismiss();
            toast.success("Profile updated successfully");
            setIsEditing(false);
            
            // 4. Final sync from server
            await fetchProfile();
        } catch (error) {
            toast.dismiss();
            console.error("Update Profile Error:", error);
            const errorMsg = error.response?.data?.message || "Failed to update profile";
            toast.error(errorMsg);
        }
    };

    if (loading) return <div className="p-8 text-center mt-20 text-gray-500">Loading profile...</div>;
    if (!user) return <div className="p-8 text-center mt-20 text-red-500">User not found.</div>;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Profile Header */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <img 
                        src={user.image || 'https://via.placeholder.com/150'} 
                        alt={user.name} 
                        className="w-32 h-32 rounded-full object-cover border-4 border-blue-500/20"
                    />
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="flex items-center justify-center md:justify-start gap-4">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="px-4 py-1.5 text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                                >
                                    {isEditing ? 'Cancel' : 'Edit Profile'}
                                </button>
                            </div>
                        </div>
                        <p className="text-gray-500 dark:text-zinc-400 flex items-center justify-center md:justify-start gap-2">
                            <User size={16} /> {user.email}
                        </p>
                        {user.organization && (
                            <p className="text-gray-500 dark:text-zinc-400 flex items-center justify-center md:justify-start gap-2">
                                <Building size={16} /> {user.organization}
                            </p>
                        )}
                    </div>
                </div>

                {isEditing ? (
                    <form onSubmit={handleUpdateProfile} className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Name</label>
                            <input 
                                type="text" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Organization</label>
                            <input 
                                type="text" 
                                value={formData.organization}
                                onChange={(e) => setFormData({...formData, organization: e.target.value})}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Bio</label>
                            <textarea 
                                value={formData.bio}
                                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Skills</label>
                            <input 
                                type="text" 
                                value={formData.skills}
                                onChange={(e) => setFormData({...formData, skills: e.target.value})}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="E.g. React, Python, Java..."
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Achievements</label>
                            <input 
                                type="text" 
                                value={formData.achievements}
                                onChange={(e) => setFormData({...formData, achievements: e.target.value})}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="E.g. Hackathon winner, Certifications..."
                            />
                        </div>
                        <div className="space-y-4 md:col-span-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Experience</label>
                                <button type="button" onClick={() => setFormData({...formData, experience: [...formData.experience, {role: '', company: '', duration: '', description: ''}]})} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition dark:bg-blue-900/30 dark:text-blue-400">Add Experience</button>
                            </div>
                            {formData.experience.map((exp, i) => (
                                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border border-gray-200 dark:border-zinc-800 rounded-lg bg-gray-50/50 dark:bg-zinc-800/30">
                                    <input placeholder="Role" value={exp.role} onChange={(e) => { const newExp = [...formData.experience]; newExp[i].role = e.target.value; setFormData({...formData, experience: newExp}) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500" />
                                    <input placeholder="Company" value={exp.company} onChange={(e) => { const newExp = [...formData.experience]; newExp[i].company = e.target.value; setFormData({...formData, experience: newExp}) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500" />
                                    <input placeholder="Duration (e.g. 2020-2022)" value={exp.duration} onChange={(e) => { const newExp = [...formData.experience]; newExp[i].duration = e.target.value; setFormData({...formData, experience: newExp}) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500" />
                                    <input placeholder="Short Description" value={exp.description} onChange={(e) => { const newExp = [...formData.experience]; newExp[i].description = e.target.value; setFormData({...formData, experience: newExp}) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500" />
                                    <button type="button" onClick={() => { const newExp = formData.experience.filter((_, idx) => idx !== i); setFormData({...formData, experience: newExp}) }} className="sm:col-span-2 text-xs text-red-500 text-right hover:underline">Remove</button>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4 md:col-span-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Education</label>
                                <button type="button" onClick={() => setFormData({...formData, education: [...formData.education, {degree: '', school: '', year: ''}]})} className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition dark:bg-emerald-900/30 dark:text-emerald-400">Add Education</button>
                            </div>
                            {formData.education.map((edu, i) => (
                                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border border-gray-200 dark:border-zinc-800 rounded-lg bg-gray-50/50 dark:bg-zinc-800/30">
                                    <input placeholder="Degree" value={edu.degree} onChange={(e) => { const newEdu = [...formData.education]; newEdu[i].degree = e.target.value; setFormData({...formData, education: newEdu}) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500" />
                                    <input placeholder="School / University" value={edu.school} onChange={(e) => { const newEdu = [...formData.education]; newEdu[i].school = e.target.value; setFormData({...formData, education: newEdu}) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500" />
                                    <input placeholder="Year" value={edu.year} onChange={(e) => { const newEdu = [...formData.education]; newEdu[i].year = e.target.value; setFormData({...formData, education: newEdu}) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500 sm:col-span-2" />
                                    <button type="button" onClick={() => { const newEdu = formData.education.filter((_, idx) => idx !== i); setFormData({...formData, education: newEdu}) }} className="sm:col-span-2 text-xs text-red-500 text-right hover:underline">Remove</button>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4 md:col-span-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Projects</label>
                                <button type="button" onClick={() => setFormData({...formData, projects_info: [...formData.projects_info, {name: '', description: '', link: ''}]})} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition dark:bg-indigo-900/30 dark:text-indigo-400">Add Project</button>
                            </div>
                            {formData.projects_info.map((proj, i) => (
                                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border border-gray-200 dark:border-zinc-800 rounded-lg bg-gray-50/50 dark:bg-zinc-800/30">
                                    <input placeholder="Project Name" value={proj.name} onChange={(e) => { const newProj = [...formData.projects_info]; newProj[i].name = e.target.value; setFormData({...formData, projects_info: newProj}) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500" />
                                    <input placeholder="Link URL" value={proj.link} onChange={(e) => { const newProj = [...formData.projects_info]; newProj[i].link = e.target.value; setFormData({...formData, projects_info: newProj}) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500" />
                                    <input placeholder="Description" value={proj.description} onChange={(e) => { const newProj = [...formData.projects_info]; newProj[i].description = e.target.value; setFormData({...formData, projects_info: newProj}) }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500 sm:col-span-2" />
                                    <button type="button" onClick={() => { const newProj = formData.projects_info.filter((_, idx) => idx !== i); setFormData({...formData, projects_info: newProj}) }} className="sm:col-span-2 text-xs text-red-500 text-right hover:underline">Remove</button>
                                </div>
                            ))}
                        </div>
                        <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">
                            Save Changes
                        </button>
                    </form>
                ) : (
                    <div className="mt-8 space-y-8">
                        {/* Bio & Skills */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                                    <Briefcase size={20} className="text-blue-500" /> Bio
                                </h3>
                                <p className="text-gray-600 dark:text-zinc-400 leading-relaxed">
                                    {user.bio || "No bio added yet."}
                                </p>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                                    <Code size={20} className="text-purple-500" /> Skills
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {user.skills ? user.skills.split(',').map((skill, i) => (
                                        <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-full text-sm font-medium border border-gray-200 dark:border-zinc-700">
                                            {skill.trim()}
                                        </span>
                                    )) : <p className="text-gray-500 dark:text-zinc-500">No skills added yet.</p>}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Experience */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                                    <Briefcase size={20} className="text-orange-500" /> Experience
                                </h3>
                                <div className="space-y-4">
                                    {user.experience && user.experience.length > 0 ? user.experience.map((exp, i) => (
                                        <div key={i} className="p-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30">
                                            <p className="font-bold text-gray-900 dark:text-white">{exp.role}</p>
                                            <p className="text-sm text-blue-600 dark:text-blue-400">{exp.company}</p>
                                            <p className="text-xs text-gray-400 mt-1">{exp.duration}</p>
                                            <p className="text-sm text-gray-600 dark:text-zinc-400 mt-2">{exp.description}</p>
                                        </div>
                                    )) : <p className="text-gray-500 dark:text-zinc-500 text-sm italic">No experience added.</p>}
                                </div>
                            </div>

                            {/* Education */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                                    <GraduationCap size={20} className="text-emerald-500" /> Education
                                </h3>
                                <div className="space-y-4">
                                    {user.education && user.education.length > 0 ? user.education.map((edu, i) => (
                                        <div key={i} className="p-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30">
                                            <p className="font-bold text-gray-900 dark:text-white">{edu.degree}</p>
                                            <p className="text-sm text-emerald-600 dark:text-emerald-400">{edu.school}</p>
                                            <p className="text-xs text-gray-400 mt-1">{edu.year}</p>
                                        </div>
                                    )) : <p className="text-gray-500 dark:text-zinc-500 text-sm italic">No education added.</p>}
                                </div>
                            </div>
                        </div>

                        {/* Projects & Achievements */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Projects Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                                    <Globe size={20} className="text-indigo-500" /> Portfolio Projects
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {user.projects_info && user.projects_info.length > 0 ? user.projects_info.map((proj, i) => (
                                        <div key={i} className="p-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30">
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-gray-900 dark:text-white">{proj.name}</p>
                                                {proj.link && (
                                                    <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600">
                                                        <ExternalLink size={16} />
                                                    </a>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-zinc-400 mt-2">{proj.description}</p>
                                        </div>
                                    )) : <p className="text-gray-500 dark:text-zinc-500 text-sm italic">No external projects added.</p>}
                                </div>
                            </div>

                            {/* Achievements */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                                    <Award size={20} className="text-yellow-500" /> Achievements
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {user.achievements ? user.achievements.split(',').map((award, i) => (
                                        <div key={i} className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 rounded-xl">
                                            <Award size={14} className="text-yellow-600 dark:text-yellow-500" />
                                            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-500">{award.trim()}</span>
                                        </div>
                                    )) : <p className="text-gray-500 dark:text-zinc-500 text-sm italic">No achievements added yet.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showAIOnboarding && (
                <AIPortfolioOnboarding 
                    onClose={() => setShowAIOnboarding(false)} 
                    onComplete={() => {
                        setShowAIOnboarding(false);
                        toast.success("Portfolio updated!");
                        fetchProfile();
                    }}
                />
            )}

            {/* Personal Performance Analytics */}
            {performanceAnalytics && (
                <div className="space-y-6 animate-fade-in">
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                        <TrendingUp className="text-blue-500" /> Personal Performance
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 p-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform duration-300">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Overall Score</span>
                            <span className="text-4xl font-black text-blue-700 dark:text-blue-300">{performanceAnalytics.score}</span>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 p-6 rounded-2xl border border-purple-200 dark:border-purple-900/50 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform duration-300">
                            <span className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Task Accuracy</span>
                            <span className="text-4xl font-black text-purple-700 dark:text-purple-300">{performanceAnalytics.accuracy}%</span>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform duration-300">
                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">Completed / On Time</span>
                            <span className="text-4xl font-black text-emerald-700 dark:text-emerald-300">{performanceAnalytics.completedTasks} <span className="text-xl text-emerald-500">/ {performanceAnalytics.onTime}</span></span>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 p-6 rounded-2xl border border-orange-200 dark:border-orange-900/50 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform duration-300">
                            <span className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">Reopened / Late</span>
                            <span className="text-4xl font-black text-orange-700 dark:text-orange-300">{performanceAnalytics.reopenedCount} <span className="text-xl text-orange-500">/ {performanceAnalytics.late}</span></span>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Analytics Section */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                    <BarChart2 className="text-green-500" /> Project Analytics
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {analytics.map((org, i) => (
                        <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
                            <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 border-b border-gray-200 dark:border-zinc-800">
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Building size={18} className="text-blue-500" /> {org.organization}
                                </h3>
                            </div>
                            <div className="p-4 space-y-4">
                                {org.projects.map((proj, j) => (
                                    <div key={j} className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-gray-700 dark:text-zinc-300">{proj.name}</span>
                                            <span className="text-gray-500 dark:text-zinc-500">{proj.completedTasks}/{proj.totalTasks} Done</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-blue-500 transition-all duration-500" 
                                                style={{ width: `${(proj.completedTasks / proj.totalTasks) * 100 || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {org.projects.length === 0 && <p className="text-center text-gray-500 text-sm py-4">No active projects in this organization.</p>}
                            </div>
                        </div>
                    ))}
                    {analytics.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700">
                            <BarChart2 size={48} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
                            <p className="text-gray-500 dark:text-zinc-500">No task data available yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
