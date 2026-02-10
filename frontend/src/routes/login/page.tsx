// src/components/Login.tsx
import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Login() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en";
    useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("https://steve-airways.onrender.com/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Échec de la connexion");
                setLoading(false);
                return;
            }

            // ✅ Stocker le token et les données utilisateur
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("token", data.token); // Garder les deux pour compatibilité
            localStorage.setItem("user", JSON.stringify(data.user));

            // ✅ Redirection conditionnelle selon le rôle et les permissions
            if (data.user.role === "admin") {
                navigate(`/${currentLang}/dashboard`);
            } else {
                const permissions = data.user.permissions;

                // Fonction pour parser les permissions
                const parsePermissions = (permissions: string | string[]): string[] => {
                    if (Array.isArray(permissions)) {
                        return permissions;
                    }
                    if (typeof permissions === "string") {
                        return permissions.split(",").map((p: string) => p.trim());
                    }
                    return [];
                };

                const permissionArray = parsePermissions(permissions);

                // Redirection selon les permissions
                if (permissionArray.includes("listeFlightsPlane")) {
                    navigate(`/${currentLang}/dashboard/flights`);
                } else if (permissionArray.includes("listeFlightsHelico")) {
                    navigate(`/${currentLang}/dashboard/flights-helico`);
                } else if (permissionArray.includes("charter")) {
                    navigate(`/${currentLang}/dashboard/flights-charter`);
                } else {
                    // Redirection par défaut si aucune permission ne correspond
                    navigate(`/${currentLang}/dashboard`);
                }
            }
        } catch (err) {
            console.error(err);
            setError("Erreur serveur, réessayez plus tard.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="flex min-h-screen items-center justify-center bg-gray-100"
            style={{
                backgroundImage:
                    "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500"></div>
            <div className="relative z-10 mx-4 w-full max-w-md">
                <div className="hover:shadow-3xl transform rounded-2xl border border-white/30 bg-white/95 p-8 shadow-2xl backdrop-blur-lg transition-all duration-300">
                    {/* Logo compagnie aérienne */}
                    <div className="mb-6 flex justify-center">
                        <div className="flex items-center space-x-2">
                            <div className="text-3xl">🦅</div>
                            <div>
                                <h1 className="text-2xl font-bold text-blue-900">Trogon Airways</h1>
                                <p className="text-xs text-gray-500">Flight Management System</p>
                            </div>
                        </div>
                    </div>

                    <h2 className="mb-2 text-center text-xl font-bold text-gray-800">Admin Login</h2>
                    <p className="mb-6 text-center text-sm text-gray-600">Access the flight and reservation management system</p>

                    {error && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                <span className="flex items-center">
                                    <svg
                                        className="mr-1 h-4 w-4 text-gray-400"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    User
                                </span>
                            </label>
                            <input
                                type="text"
                                placeholder="John Doe"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                <span className="flex items-center">
                                    <svg
                                        className="mr-1 h-4 w-4 text-gray-400"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    Password
                                </span>
                            </label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full transform items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg
                                        className="-ml-1 mr-3 h-4 w-4 animate-spin text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Connecting...
                                </span>
                            ) : (
                                <span className="flex items-center">
                                    <LogIn className="mr-2 h-4 w-4" />
                                    Sign in
                                </span>
                            )}
                        </button>
                    </form>
{/* 
                    <p className="mt-6 text-center text-xs text-gray-400">
                        Ceci est un environnement prototype. Les identifiants sont uniquement à des fins de démonstration.
                    </p> */}
                </div>
            </div>
        </div>
    );
}
