// hooks/useAuth.ts
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";

export const useAuth = () => {
    const navigate = useNavigate();
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en";
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (!token) {
            navigate(`/${currentLang}/login`);
            return;
        }

        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (error) {
                console.error("Erreur parsing user data:", error);
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                navigate(`/${currentLang}/login`);
            }
        }

        setLoading(false);
    }, [navigate, currentLang]);

    const isAdmin = user?.role === "admin";
    const isOperateur = user?.role === "operateur"; // <-- nouvelle vérification

    return { 
        user, 
        loading, 
        isAdmin,
        isOperateur // <-- on retourne aussi ce booléen
    };
};
