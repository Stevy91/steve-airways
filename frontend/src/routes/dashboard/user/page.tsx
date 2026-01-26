import { useState, useEffect } from "react";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    EditIcon,
    Eye,
    MailIcon,
    PhoneIcon,
    SettingsIcon,
    ShieldIcon,
    UserIcon,
    UserPlus,
    UserXIcon,
    X,
} from "lucide-react";

import { useTheme } from "../../../contexts/theme-context";
import { useAuth } from "../../../hooks/useAuth";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";

// Types
type Users = {
    id: number;
    email?: string;
    name?: string;
    role?: string;
    phone?: string;
    username?: string;
    password_hash?: string;
};

const Users = () => {
    const { theme } = useTheme();
    const { isAdmin, isOperateur } = useAuth();
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en"; // <-- ici on définit currentLang

    const [stats, setStats] = useState<Users[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
     const [editingFlight, setEditingFlight] = useState<Users | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentUsers = stats.slice(indexOfFirstRow, indexOfLastRow);
    const totalPages = Math.ceil(stats.length / rowsPerPage);

       const [id, setID] = useState("");
       const [username, setUserName] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("");
    const [password_hash, setPassword_hash] = useState("");

 
 
    const [success, setSuccess] = useState("");

      const handleEditClick = (user: Users) => {
        if (!isAdmin) {
            toast.error("❌ Accès refusé - Admin uniquement");
            return;
        }

        console.log("User à éditer:", user);


        setEditingFlight(user);

        setShowModal(true);
    };



    const handleSubmit = async (userData: any) => {
      
        setError("");
        setSuccess("");
      

        try {
            const res = await fetch("https://steve-airways.onrender.com/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`, // <-- token admin
                },
                body: JSON.stringify(userData),
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("Erreur API Register:", data);
                throw new Error(data.error || "Erreur lors de l'inscription");
            }

            setSuccess("Account created successfully!");
            fetchDashboardData();
           
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (userId: number, userdData: any) => {
   
        setError("");
        setSuccess("");
      

        try {
            const res = await fetch(`https://steve-airways.onrender.com/api/users/${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                 
                },
                body: JSON.stringify(userdData),
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("Erreur API Register:", data);
                throw new Error(data.error || "Erreur lors de l'inscription");
            }

            setSuccess("Account update successfully!");
            fetchDashboardData();
           
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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

    function navigate(arg0: string): void {
        throw new Error("Function not implemented.");
    }

    return (
        <div className="flex flex-col gap-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">All Users</h1>

                {/* Bouton Add new flight seulement pour les admins */}

                <button
                    onClick={() => {
                        setShowModal(true);
                    }}
                    className="rounded bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-white hover:from-amber-600 hover:to-amber-500 hover:text-black"
                >
                    Add User
                </button>
            </div>
            <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                    Showing {currentUsers.length} of {stats.length} users
                </div>
            </div>

            {/* TABLEAU Users */}
            <div className="card overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                <div className="card-body p-0">
                    <div className="relative overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                                            <div className="flex items-center gap-2">
                                                <span>Access</span>
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="h-4 w-4" />
                                                <span>Name</span>
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                                            <div className="flex items-center gap-2">
                                                <MailIcon className="h-4 w-4" />
                                                <span>Email</span>
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                                            <div className="flex items-center gap-2">
                                                <PhoneIcon className="h-4 w-4" />
                                                <span>Phone</span>
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                                            <div className="flex items-center gap-2">
                                                <ShieldIcon className="h-4 w-4" />
                                                <span>Role</span>
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">Actions</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {currentUsers.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="py-12 text-center"
                                            >
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                                                        <UserXIcon className="h-8 w-8 text-gray-400" />
                                                    </div>
                                                    <p className="text-lg font-medium text-gray-500">No users found</p>
                                                    <p className="mt-1 text-sm text-gray-400">Try adjusting your search or filter</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        currentUsers.map((user: Users) => (
                                            <tr
                                                key={user.id}
                                                className="transition-colors duration-150 hover:bg-gray-50"
                                            >
                                                <td className="px-6 py-4">
                                                    <a
                                                        href={`/${currentLang}/dashboard/permissions/${user.id}`}
                                                        className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
                                                    >
                                                        <SettingsIcon className="h-4 w-4" />
                                                        Manage Access
                                                    </a>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-indigo-100">
                                                            <span className="text-sm font-semibold text-amber-600">
                                                                {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                                                            </span>
                                                        </div>
                                                        <span className="font-medium text-gray-800">{user.name ?? "Unknown"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-600">{user.email ?? "No email"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-gray-600">{user.phone ?? "N/A"}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                                            user.role === "admin"
                                                                ? "bg-purple-100 text-purple-800"
                                                                : user.role === "manager"
                                                                  ? "bg-amber-100 text-amber-800"
                                                                  : "bg-emerald-100 text-emerald-800"
                                                        }`}
                                                    >
                                                        {user.role === "user" ? "Agent " : "Admin"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-amber-600 hover:to-amber-700 hover:shadow"
                                                            onClick={() => handleEditClick(user)}
                                                        >
                                                            <EditIcon className="h-4 w-4" />
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
                                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <ChevronLeftIcon className="h-4 w-4" />
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
                                                        className={`h-10 w-10 rounded-lg text-sm font-medium transition-colors ${
                                                            currentPage === pageNum
                                                                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                                                                : "text-gray-600 hover:bg-gray-100"
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
                                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Next
                                            <ChevronRightIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50">
                        <motion.div
                            className="absolute inset-0 bg-black/50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setShowModal(false);
                            }}
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            className="absolute inset-0 mx-auto flex max-w-md items-start justify-center p-4 sm:my-12 "
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        >
                            <div className="relative max-w-md w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                                <button
                                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    aria-label="Close"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingFlight(null);
                                    }}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                                <div className="flex items-center justify-center bg-white">
                                    <div className="w-full   p-8 ">
                                        <h2 className="mb-2 text-center text-2xl font-bold text-blue-900">{editingFlight ? "Edit Account" : "Add Account"}</h2>
                                        
                                        {error && <div className="mb-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-600">{error}</div>}
                                        {success && <div className="mb-4 rounded-lg bg-green-100 px-3 py-2 text-sm text-green-600">{success}</div>}

                                        <form
                                         

                                            onSubmit={async (e) => {
                                        e.preventDefault();
                                        setLoading(true);
                                        const formData = new FormData(e.currentTarget);

                                        const userData = {
                                           
                                            id: formData.get("id") as string,
                                            username: formData.get("username") as string,
                                            name: formData.get("name") as string,
                                            // email: formData.get("email") as string,
                                            phone: formData.get("phone") as string,                                           
                                            role: formData.get("role") as string,
                                            password_hash: formData.get("password_hash") as string,
                                        };
                                      

                                        console.log("Données à envoyer:", userData);

                                        try {
                                            if (editingFlight) {
                                                await handleUpdateUser(editingFlight.id, userData);
                                            } else {
                                                await handleSubmit(userData);
                                            }
                                        } catch (err) {
                                            console.error("Erreur dans le formulaire:", err);
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                            className="space-y-4"
                                        >
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Username</label>
                                                <input
                                                    type="text"
                                                    name="username"
                                                    placeholder="Dupont"
                                                    value={editingFlight?.username || username}
                                                   
                                                    onChange={(e) => setUserName(e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />

                                                 <input
                                                    type="text"
                                                    name="id"
                                                    placeholder="Dupont"
                                                    value={editingFlight?.id || id}
                                                   
                                                    onChange={(e) => setID(e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                  hidden
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    placeholder="Jean Dupont"
                                                    value={editingFlight?.name || name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    placeholder="+50912345678"
                                                    value={editingFlight?.phone || phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            {/* <div>
                                                <label className="block text-sm font-medium text-gray-700">E-mail</label>
                                                <input
                                                    type="email"
                                                    placeholder="admin@trogonairways.com"
                                                    value={editingFlight?.email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                
                                                />
                                            </div> */}

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                                <input
                                                    type="text"
                                                    name="role"
                                                    placeholder="admin, user"
                                                    value={editingFlight?.role || role}
                                                    onChange={(e) => setRole(e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                                <input
                                                    type="password"
                                                    name="password_hash"
                                                    placeholder="password"
                                                    value={password_hash}
                                                    onChange={(e) => setPassword_hash(e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex w-full items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-white transition hover:bg-orange-600 disabled:opacity-50"
                                            >
                                                <UserPlus className="mr-2 h-4 w-4" /> {loading ? "In progress..." : editingFlight ? "Update Account" : "Create Account"}
                                            </button>
                                        </form>

                                        {/* <p className="mt-6 text-center text-sm text-gray-600">
                                            Déjà inscrit ?{" "}
                                            <button
                                                onClick={() => navigate(`/${currentLang}/login`)}
                                                className="text-blue-600 hover:underline"
                                            >
                                                Se connecter
                                            </button>
                                        </p>

                                        <p className="mt-6 text-center text-xs text-gray-400">
                                            Ceci est un environnement prototype. Les données sont uniquement à des fins de démonstration.
                                        </p> */}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Users;
