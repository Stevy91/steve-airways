import { useState, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon, EditIcon, Eye, MailIcon, PhoneIcon, SettingsIcon, ShieldIcon, UserIcon, UserXIcon } from "lucide-react";

import { useTheme } from "../../../contexts/theme-context";
import { useAuth } from "../../../hooks/useAuth";
import { useParams } from "react-router-dom";

// Types
type Users = {
    id: number;
    email?: string;
    name?: string;
    role?: string;
    phone?: string;
};



const Users = () => {
    const { theme } = useTheme();
    const { isAdmin, isOperateur } = useAuth();
        const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en"; // <-- ici on définit currentLang

    const [stats, setStats] = useState<Users[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentUsers = stats.slice(indexOfFirstRow, indexOfLastRow);
    const totalPages = Math.ceil(stats.length / rowsPerPage);

    // Charger liste par défaut = date du jour
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");

            const response = await fetch("https://steve-airways.onrender.com/api/users", {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`, // <- obligatoire
                },
            });

            const data = await response.json();

            if (data.error) {
                setError(data.error); // Affiche le vrai message
                setStats([]); // Evite stats undefined
            } else {
                setStats(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            setError("Impossible de charger les données");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    if (!stats) return null;

    return (
<div className="flex flex-col gap-y-6">
    <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">All Users</h1>
        <div className="text-sm text-gray-500">
            Showing {currentUsers.length} of {stats.length} users
        </div>
    </div>

    {/* TABLEAU Users */}
    <div className="card bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="card-body p-0">
            <div className="relative overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="py-4 px-6 text-left font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        <span>Access</span>
                                    </div>
                                </th>
                                <th className="py-4 px-6 text-left font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        <UserIcon className="w-4 h-4" />
                                        <span>Name</span>
                                    </div>
                                </th>
                                <th className="py-4 px-6 text-left font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        <MailIcon className="w-4 h-4" />
                                        <span>Email</span>
                                    </div>
                                </th>
                                <th className="py-4 px-6 text-left font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        <PhoneIcon className="w-4 h-4" />
                                        <span>Phone</span>
                                    </div>
                                </th>
                                <th className="py-4 px-6 text-left font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        <ShieldIcon className="w-4 h-4" />
                                        <span>Role</span>
                                    </div>
                                </th>
                                <th className="py-4 px-6 text-left font-semibold text-gray-700 text-sm uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {currentUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                <UserXIcon className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-gray-500 text-lg font-medium">No users found</p>
                                            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentUsers.map((user: Users) => (
                                    <tr 
                                        key={user.id} 
                                        className="hover:bg-gray-50 transition-colors duration-150"
                                    >
                                        <td className="py-4 px-6">
                                            <a 
                                                href={`/${currentLang}/dashboard/permissions/${user.id}`}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                            >
                                                <SettingsIcon className="w-4 h-4" />
                                                Manage Access
                                            </a>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-indigo-100 rounded-full flex items-center justify-center">
                                                    <span className="text-amber-600 font-semibold text-sm">
                                                        {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
                                                    </span>
                                                </div>
                                                <span className="font-medium text-gray-800">
                                                    {user.name ?? 'Unknown'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-600">
                                                    {user.email ?? 'No email'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-gray-600">
                                                {user.phone ?? 'N/A'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                                user.role === 'admin' 
                                                    ? 'bg-purple-100 text-purple-800' 
                                                    : user.role === 'manager'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-emerald-100 text-emerald-800' 
                                            }`}>
                                                {user.role ?? 'user'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-amber-700 transition-all shadow-sm hover:shadow">
                                                    <EditIcon className="w-4 h-4" />
                                                    Edit
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                {currentUsers.length > 0 && (
                    <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Page <span className="font-semibold">{currentPage}</span> of{" "}
                                <span className="font-semibold">{totalPages}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeftIcon className="w-4 h-4" />
                                    Previous
                                </button>
                                
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                                                    currentPage === pageNum
                                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                                                        : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                    <ChevronRightIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
</div>
    );
};

export default Users;
