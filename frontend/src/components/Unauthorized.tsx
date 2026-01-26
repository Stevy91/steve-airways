// components/Unauthorized.tsx
import { useNavigate, useParams } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function Unauthorized() {
    const navigate = useNavigate();
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en";

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
                <ShieldAlert className="mx-auto mb-4 h-16 w-16 text-red-500" />
                <h2 className="mb-2 text-2xl font-bold text-gray-800">Accès Refusé</h2>
                <p className="mb-6 text-gray-600">
                    Vous n'avez pas les permissions nécessaires pour accéder à cette page.
                </p>
                <button
                    onClick={() => navigate(`/${currentLang}/login`)}
                    className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                >
                    Retour au Dashboard
                </button>
            </div>
        </div>
    );
}