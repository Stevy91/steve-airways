// src/components/Login.tsx
import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom"; // si tu utilises react-router-dom
import { useAuth } from "../../hooks/useAuth";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en"; // <-- ici on définit currentLang
    useAuth();

   // Dans votre composant Login
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
        const res = await fetch("https://steve-airways.onrender.com/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            setError(data.error || "Échec de la connexion");
            setLoading(false);
            return;
        }

        // ✅ CORRECTION : Stocker avec la clé 'authToken'
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("token", data.token); // Garder les deux pour compatibilité
        localStorage.setItem("user", JSON.stringify(data.user));

        navigate(`/${currentLang}/dashboard`);
    } catch (err) {
        console.error(err);
        setError("Erreur serveur, réessayez plus tard.");
    } finally {
        setLoading(false);
    }
};

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
                <h2 className="mb-2 text-center text-2xl font-bold text-blue-900">Connexion Admin</h2>
                <p className="mb-6 text-center text-sm text-gray-500">
                    Entrez vos identifiants pour accéder au panneau <br />
                    d'administration de Trogon Airways.
                </p>

                {error && <p className="mb-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-600">{error}</p>}

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >
                    <div>
                        <label className="block text-sm font-medium text-gray-700">E-mail</label>
                        <input
                            type="email"
                            placeholder="admin@trogonairways.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                        className="flex w-full items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                        {loading ? (
                            "Connexion..."
                        ) : (
                            <>
                                <LogIn className="mr-2 h-4 w-4" /> Connexion
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-6 text-center text-xs text-gray-400">
                    Ceci est un environnement prototype. Les identifiants sont uniquement à des fins de démonstration.
                </p>
            </div>
        </div>
    );
}
