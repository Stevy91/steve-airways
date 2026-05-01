// hooks/useAuth.ts
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

const INACTIVITY_TIME = 60 * 60 * 1000; // 60 minutes (corrigé 58*60*1000 = 58 minutes)

export const useAuth = () => {
    const navigate = useNavigate();
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en";

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<string[]>([]);
    const logoutTimer = useRef<NodeJS.Timeout | null>(null);

    // Fonction pour parser les permissions
    const parsePermissions = useCallback((permissionsString: string | string[]): string[] => {
        if (!permissionsString) return [];
        
        if (Array.isArray(permissionsString)) {
            return permissionsString.filter(p => p && p.trim().length > 0);
        }
        
        if (typeof permissionsString === 'string') {
            return permissionsString
                .split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0);
        }
        
        return [];
    }, []);

    // 🔐 Logout function
    const logout = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setUser(null);
        setPermissions([]);
        navigate(`/${currentLang}/login`);
    }, [navigate, currentLang]);

    // 🔄 Reset inactivity timer
    const resetTimer = useCallback(() => {
        if (logoutTimer.current) {
            clearTimeout(logoutTimer.current);
        }

        logoutTimer.current = setTimeout(() => {
            console.log("⏰ Session expirée (inactivité)");
            logout();
        }, INACTIVITY_TIME);
    }, [logout]);

    useEffect(() => {
        const token = localStorage.getItem("token") || localStorage.getItem("authToken");
        const userData = localStorage.getItem("user");

        // Si pas de token, rediriger vers login
        if (!token) {
            navigate(`/${currentLang}/login`);
            setLoading(false);
            return;
        }

        // Si pas de données utilisateur, déconnecter
        if (!userData) {
            logout();
            setLoading(false);
            return;
        }

        // Fonction async séparée pour pouvoir utiliser await
        const initAuth = async () => {
            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);

                // 1️⃣ Appliquer les permissions du localStorage immédiatement (render rapide)
                if (parsedUser.permissions) {
                    setPermissions(parsePermissions(parsedUser.permissions));
                }

                // 2️⃣ Rafraîchir les permissions depuis le serveur (l'admin peut les avoir modifiées)
                try {
                    const freshRes = await fetch("https://steve-airways.onrender.com/api/profile", {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (freshRes.ok) {
                        const freshUser = await freshRes.json();
                        if (freshUser && freshUser.permissions !== undefined) {
                            setPermissions(parsePermissions(freshUser.permissions));
                            const updatedUser = { ...parsedUser, permissions: freshUser.permissions };
                            localStorage.setItem("user", JSON.stringify(updatedUser));
                            setUser(updatedUser);
                        }
                    }
                } catch (_freshErr) {
                    // Non bloquant — on conserve les permissions du localStorage
                }

            } catch (error) {
                console.error("Erreur auth:", error);
                logout();
            } finally {
                setLoading(false);
                resetTimer();
            }
        };

        initAuth();

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
    }, [navigate, currentLang, logout, resetTimer, parsePermissions]);

    // Fonction utilitaire pour vérifier une permission
    const hasPermission = useCallback((permission: string): boolean => {
        if (user?.role === "admin") return true; // Les admins ont toutes les permissions
        return permissions.includes(permission);
    }, [user, permissions]);

    // Vérifier si l'utilisateur a au moins une permission
    const hasAnyPermission = useCallback((requiredPermissions: string[]): boolean => {
        if (user?.role === "admin") return true;
        return requiredPermissions.some(permission => permissions.includes(permission));
    }, [user, permissions]);

    return {
        user,
        loading,
        isAdmin: user?.role === "admin",
        isOperateur: user?.role === "operateur",
        permissions,
        hasPermission,
        hasAnyPermission,
        logout,
        
        // Permissions individuelles pour compatibilité
        listeFlightsPlane: hasPermission("listeFlightsPlane"),
        listeFlightsHelico: hasPermission("listeFlightsHelico"),
        listeBookingsHelico: hasPermission("listeBookingsHelico"),
        listeBookingsPlane: hasPermission("listeBookingsPlane"),
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
        cancelledTicket: hasPermission("cancelledTicket"),
        reschedule: hasPermission("reschedule"),
        cancelFlight: hasPermission("cancelFlight")
    };
};