import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSmartAgenda } from '../features/aiSlice';
import { useAuth } from '@clerk/clerk-react';
import { Sparkles, Loader2 } from 'lucide-react';

const SmartAgenda = () => {
    const dispatch = useDispatch();
    const { getToken } = useAuth();
    const { agenda, loadingAgenda } = useSelector((state) => state.ai);

    useEffect(() => {
        const loadAgenda = async () => {
             const token = await getToken();
             if (token) dispatch(fetchSmartAgenda({ getToken }));
        }
        loadAgenda();
    }, [dispatch, getToken]);

    return (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-900 border border-indigo-100 dark:border-indigo-800 rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-xl font-semibold text-indigo-900 dark:text-indigo-100">AI Smart Agenda</h2>
            </div>
            
            {loadingAgenda ? (
                <div className="flex items-center gap-3 text-indigo-500 dark:text-indigo-300">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <p>Analyzing your tasks and priority...</p>
                </div>
            ) : typeof agenda === 'string' ? (
                <div className="text-indigo-800 dark:text-indigo-200 whitespace-pre-wrap font-medium leading-relaxed">
                    {agenda.replace(/\*\*/g, '') /* Simple markdown bold removal */}
                </div>
            ) : agenda ? (
                <div className="text-indigo-800 dark:text-indigo-200 whitespace-pre-wrap font-medium leading-relaxed">
                    {JSON.stringify(agenda)}
                </div>
            ) : (
                <p className="text-indigo-500">Failed to load agenda.</p>
            )}
        </div>
    );
};

export default SmartAgenda;
