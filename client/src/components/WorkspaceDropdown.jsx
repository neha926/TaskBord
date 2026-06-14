import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentWorkspace, fetchWorkspaces, deleteWorkspaceThunk } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import { useClerk, useOrganizationList, useAuth, useOrganization } from "@clerk/clerk-react";
import api from "../configs/api";
import toast from "react-hot-toast";

function WorkspaceDropdown() {

    const {setActive, userMemberships, isLoaded: listLoaded} = useOrganizationList({userMemberships: true})
    const {organization: activeOrg, isLoaded: orgLoaded} = useOrganization();
    const {openCreateOrganization} = useClerk();
    const { getToken } = useAuth();


    const { workspaces } = useSelector((state) => state.workspace);
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    
    const displayInfo = {
        name: activeOrg?.name || currentWorkspace?.name || "Select Workspace",
        image: activeOrg?.imageUrl || currentWorkspace?.image_url || null
    };

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const onSelectWorkspace = async (organizationId, organizationName, organizationSlug, organizationImageUrl) => {
        try{
            await setActive({organization: organizationId})
            // ensure membership exists in backend even if webhook not received
            const token = await getToken();
            await api.post('/api/workspaces/sync-active', { 
                workspaceId: organizationId, 
                name: organizationName, 
                slug: organizationSlug, 
                image_url: organizationImageUrl 
            }, { 
                headers: { Authorization: `Bearer ${token}`, 'Clerk-Organization-Id': organizationId } 
            });
            // fetch full workspace list so UI has projects/members
            await dispatch(fetchWorkspaces({ getToken }));
            dispatch(setCurrentWorkspace(organizationId))
            setIsOpen(false);
            navigate('/')
        } catch (error){
            toast.error(error?.response?.data?.message || error.message);
        }
    }

    const onDeleteWorkspace = async (e, organizationId) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this workspace? This will also delete it from Clerk.")) {
            await dispatch(deleteWorkspaceThunk({ id: organizationId, getToken }));
            // If the deleted workspace was the current one, reset it
            if (currentWorkspace?.id === organizationId) {
                dispatch(setCurrentWorkspace(null));
            }
        }
    }

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Auto-select first workspace if none is selected
    useEffect(() => {
        if (listLoaded && userMemberships.data?.length > 0 && !currentWorkspace) {
            const firstOrg = userMemberships.data[0].organization;
            onSelectWorkspace(firstOrg.id, firstOrg.name, firstOrg.slug, firstOrg.imageUrl);
        }
    }, [listLoaded, userMemberships.data, currentWorkspace]);

    useEffect(()=>{
        if(currentWorkspace && listLoaded){
            // Forcefully sync active organization if it doesn't match currentWorkspace
            if(!activeOrg || activeOrg.id !== currentWorkspace.id){
                setActive({organization: currentWorkspace.id}).catch(err => {
                    console.error("Failed to set active organization:", err);
                });
            }
        }
    },[currentWorkspace, listLoaded, activeOrg, setActive])

    return (
        <div className="relative m-4" ref={dropdownRef}>
            <button onClick={() => setIsOpen(prev => !prev)} className="w-full flex items-center justify-between p-3 h-auto text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800" >
                <div className="flex items-center gap-3">
                    {displayInfo.image ? (
                        <img src={displayInfo.image} alt={displayInfo.name} className="w-8 h-8 rounded shadow" />
                    ) : (
                        <div className="w-8 h-8 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold">
                            {displayInfo.name.charAt(0)}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                            {displayInfo.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded shadow-lg top-full left-0">
                    <div className="p-2">
                        <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2">
                            Workspaces
                        </p>
                        {listLoaded && userMemberships.data.map(({organization}) => (
                            <div key={organization.id} onClick={() => onSelectWorkspace(organization.id, organization.name, organization.slug, organization.imageUrl)} className="flex items-center gap-3 p-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-zinc-800" >
                                <img src={organization.imageUrl} alt={organization.name} className="w-6 h-6 rounded" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                        {organization.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                        {organization.membersCount || 0} members
                                    </p>
                                </div>
                                {currentWorkspace?.id === organization.id && (
                                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                )}
                                <button onClick={(e) => onDeleteWorkspace(e, organization.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-500 transition-colors" title="Delete Workspace" >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <hr className="border-gray-200 dark:border-zinc-700" />

                    <div onClick={()=>{openCreateOrganization(); setIsOpen(false)}}className="p-2 cursor-pointer rounded group hover:bg-gray-100 dark:hover:bg-zinc-800" >
                        <p className="flex items-center text-xs gap-2 my-1 w-full text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300">
                            <Plus className="w-4 h-4" /> Create Workspace
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkspaceDropdown;
