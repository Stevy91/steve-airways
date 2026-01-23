// hooks/useAuth.ts
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

const INACTIVITY_TIME = 58 * 60 * 1000; // 15 minutes

export const useAuth = () => {
    const navigate = useNavigate();
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en";

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<string[]>([]);
    const logoutTimer = useRef<NodeJS.Timeout | null>(null);

    // Fonction pour parser les permissions
    const parsePermissions = (permissionsString: string): string[] => {
        if (!permissionsString) return [];
        // Séparer par virgule, trimmer chaque permission et filtrer les vides
        return permissionsString
            .split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0);
    };

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
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                
                // Parser les permissions
                if (parsedUser.permissions) {
                    const parsedPerms = parsePermissions(parsedUser.permissions);
                    setPermissions(parsedPerms);
                }
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

    // Fonction utilitaire pour vérifier une permission
    const hasPermission = (permission: string): boolean => {
        if (user?.role === "admin") return true; // Les admins ont toutes les permissions
        return permissions.includes(permission);
    };

    return {
        user,
        loading,
        isAdmin: user?.role === "admin",
        isOperateur: user?.role === "operateur",
        permissions, // Tableau de permissions
        hasPermission, // Fonction pour vérifier une permission
        
        // Compatibilité avec le code existant (optionnel)
        listeFlightsPlane: hasPermission("listeFlightsPlane"),
        // listeBookingsPlane: hasPermission("listeBookingsPlane"),
        listeFlightsHelico: hasPermission("listeFlightsHelico"),
        // listeBookingsHelico: hasPermission("listeBookingsHelico"),
        listeUsers: hasPermission("listeUsers"),
        charter: hasPermission("charter"),
        addFlights: hasPermission("addFlights"),
        deleteFlights: hasPermission("deleteFlights"),
        manifestPdf: hasPermission("manifestPdf"),
        editFlights: hasPermission("editFlights"),
        listePassagers: hasPermission("listePassagers"),
        editBookings: hasPermission("editBookings"),
        imprimerTicket: hasPermission("imprimerTicket"),
        createdTicket: hasPermission("createdTicket"),
        dashboard: hasPermission("dashboard"),
        rapport: hasPermission("rapport"),
        cancelledTicket: hasPermission("cancelledTicket")
    };
};