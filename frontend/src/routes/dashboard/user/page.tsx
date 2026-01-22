import { useState, useEffect } from "react";
import { Eye } from "lucide-react";

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
        <div className="flex flex-col gap-y-4">
            <h1 className="title">All Users</h1>

            {/* TABLEAU UsersS */}
            <div className="card col-span-1 md:col-span-2 lg:col-span-4">
                <div className="card-body overflow-auto p-0">
                    <div className="relative w-full flex-shrink-0 overflow-auto">
                        <table className="table">
                            <thead className="table-header">
                                <tr className="table-row">
                                  
                                    <th className="table-head text-center">Access</th>
                                    <th className="table-head text-center">Name</th>
                                    <th className="table-head text-center">Email</th>
                                    <th className="table-head text-center">Phone</th>
                                    <th className="table-head text-center">Role</th>
                                    <th className="table-head text-center">Action</th>
                                </tr>
                            </thead>

                            <tbody className="table-body">
                                {currentUsers.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="text-center"
                                        >
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    currentUsers.map((user: Users) => (
                                        <tr
                                            key={user.id}
                                            className="table-row"
                                        >
                                         
                                            <td className="table-cell text-center"><a href={`/${currentLang}/dashboard/permissions/${user.id}`}>Access</a></td>
                                            <td className="table-cell text-center">{user.name}</td>
                                            <td className="table-cell text-center">{user.email}</td>
                                            <td className="table-cell text-center">{user.phone}</td>
                                            <td className="table-cell text-center">{user.role}</td>
                                            <td className="table-cell text-center">
                                                <button className="btn btn-sm btn-primary">Edit</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* PAGINATION */}
                        <div className="mt-4 flex justify-center gap-2">
                            <span>
                                Page {currentPage} / {totalPages}
                            </span>

                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="rounded bg-amber-500 px-3 py-1 text-sm text-gray-50 hover:bg-amber-600 disabled:bg-gray-200"
                            >
                                Previous
                            </button>

                            <button
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="rounded bg-amber-500 px-3 py-1 text-sm text-gray-50 hover:bg-amber-600 disabled:bg-gray-200"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Users;
