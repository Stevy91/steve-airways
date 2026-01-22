// hooks/useAuth.ts
import { P } from "framer-motion/dist/types.d-Cjd591yU";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

const INACTIVITY_TIME = 58 * 60 * 1000; // 15 minutes

export const useAuth = () => {
    const navigate = useNavigate();
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en";

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const logoutTimer = useRef<NodeJS.Timeout | null>(null);

    // 🔐 Logout function
    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate(`/${currentLang}/login`);
    };

    // 🔄 Reset inactivity timer
    const resetTimer = () => {
        if (logoutTimer.current) {
            clearTimeout(logoutTimer.current);
        }

        logoutTimer.current = setTimeout(() => {
            console.log("⏰ Session expirée (inactivité)");
            logout();
        }, INACTIVITY_TIME);
    };

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
            } catch {
                logout();
                return;
            }
        }

        setLoading(false);
        resetTimer();

        // 👂 Écoute activité utilisateur
        const events = ["click", "mousemove", "keydown", "scroll"];
        events.forEach(event =>
            window.addEventListener(event, resetTimer)
        );

        return () => {
            if (logoutTimer.current) clearTimeout(logoutTimer.current);
            events.forEach(event =>
                window.removeEventListener(event, resetTimer)
            );
        };
    }, [navigate, currentLang]);

    return {
        user,
        loading,
        isAdmin: user?.role === "admin",
        isOperateur: user?.role === "operateur",
        listeFlightsPlane: user?.role === "listeFlightsPlane",
        listeBookingsPlane: user?.role === "listeBookingsPlane",
        listeFlightsHelico: user?.role === "listeFlightsHelico",
        listeBookingsHelico: user?.role === "listeBookingsHelico",
        listeUsers: user?.role === "listeUsers",
        addFlights: user?.role === "addFlights",
        editFlights: user?.role === "editFlights",
        listePassagers: user?.role === "listePassagers",
        editBookings: user?.role === "editBookings",
        imprimerTicket: user?.role === "imprimeTicket"
    };
};