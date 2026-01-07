// src/components/Register.tsx
import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom"; // si tu utilises react-router

export default function Register() {
    const [username, setUserName] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const navigate = useNavigate();
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en"; // <-- ici on définit currentLang


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const res = await fetch("https://steve-airways.onrender.com/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`, // <-- token admin
                },
                body: JSON.stringify({username, name, phone, password, role}),
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("Erreur API Register:", data);
                throw new Error(data.error || "Erreur lors de l'inscription");
            }

            setSuccess("Compte créé avec succès !");
           
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
                <h2 className="mb-2 text-center text-2xl font-bold text-blue-900">Inscription</h2>
                <p className="mb-6 text-center text-sm text-gray-500">
                    Créez un compte administrateur pour accéder <br />
                    au panneau de gestion de Trogon Airways.
                </p>

                {error && <div className="mb-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-600">{error}</div>}
                {success && <div className="mb-4 rounded-lg bg-green-100 px-3 py-2 text-sm text-green-600">{success}</div>}

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >
                <div>
                        <label className="block text-sm font-medium text-gray-700">Nom Utilisateur</label>
                        <input
                            type="text"
                            placeholder="Dupont"
                            value={username}
                            onChange={(e) => setUserName(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nom complet</label>
                        <input
                            type="text"
                            placeholder="Jean Dupont"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                        <input
                            type="tel"
                            placeholder="+50912345678"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          
                        />
                    </div>

                    {/* <div>
                        <label className="block text-sm font-medium text-gray-700">E-mail</label>
                        <input
                            type="email"
                            placeholder="admin@trogonairways.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          
                        />
                    </div> */}

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <input
                            type="text"
                            placeholder="admin, user"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
                        <input
                            type="password"
                            placeholder="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-white transition hover:bg-orange-600 disabled:opacity-50"
                    >
                        <UserPlus className="mr-2 h-4 w-4" /> {loading ? "En cours..." : "Créer un compte"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
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
                </p>
            </div>
        </div>
    );
}
