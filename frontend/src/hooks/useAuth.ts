// hooks/useAuth.ts
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

const INACTIVITY_TIME = 60 * 60 * 1000; // 60 minutes

export const useAuth = () => {
    const navigate = useNavigate();
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en";

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<string[]>([]);
    const logoutTimer = useRef<NodeJS.Timeout | null>(null);

    // Parser les permissions (CSV string ou tableau)
    const parsePermissions = useCallback((permissionsString: string | string[]): string[] => {
        if (!permissionsString) return [];
        if (Array.isArray(permissionsString)) {
            return permissionsString.filter(p => p && p.trim().length > 0);
        }
        if (typeof permissionsString === 'string') {
            return permissionsString.split(',').map(p => p.trim()).filter(p => p.length > 0);
        }
        return [];
    }, []);

    // Logout
    const logout = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setUser(null);
        setPermissions([]);
        navigate(`/${currentLang}/login`);
    }, [navigate, currentLang]);

    // Reset inactivity timer
    const resetTimer = useCallback(() => {
        if (logoutTimer.current) clearTimeout(logoutTimer.current);
        logoutTimer.current = setTimeout(() => {
            console.log("Session expirée (inactivité)");
            logout();
        }, INACTIVITY_TIME);
    }, [logout]);

    useEffect(() => {
        const token = localStorage.getItem("token") || localStorage.getItem("authToken");
        const userData = localStorage.getItem("user");

        if (!token) {
            navigate(`/${currentLang}/login`);
            setLoading(false);
            return;
        }

        if (!userData) {
            logout();
            setLoading(false);
            return;
        }

        const initAuth = async () => {
            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);

                // Appliquer les permissions du localStorage immédiatement
                if (parsedUser.permissions) {
                    setPermissions(parsePermissions(parsedUser.permissions));
                }

                // Rafraîchir depuis le serveur (l'admin peut avoir modifié les permissions)
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
                    // Non bloquant - on conserve les permissions du localStorage
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

        const events = ["click", "mousemove", "keydown", "scroll"];
        events.forEach(event => window.addEventListener(event, resetTimer));

        return () => {
            if (logoutTimer.current) clearTimeout(logoutTimer.current);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [navigate, currentLang, logout, resetTimer, parsePermissions]);

    const hasPermission = useCallback((permission: string): boolean => {
        if (user?.role === "admin") return true;
        return permissions.includes(permission);
    }, [user, permissions]);

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

        // Permissions individuelles
        dashboard: hasPermission("dashboard"),
        listeFlightsPlane: hasPermission("listeFlightsPlane"),
        listeFlightsHelico: hasPermission("listeFlightsHelico"),
        charter: hasPermission("charter"),
        listeBookingsPlane: hasPermission("listeBookingsPlane"),
        listeBookingsHelico: hasPermission("listeBookingsHelico"),
        manualBooking: hasPermission("manualBooking"),
        listePassagers: hasPermission("listePassagers"),
        listeUsers: hasPermission("listeUsers"),
        addFlights: hasPermission("addFlights"),
        editFlights: hasPermission("editFlights"),
        deleteFlights: hasPermission("deleteFlights"),
        cancelFlight: hasPermission("cancelFlight"),
        editBookings: hasPermission("editBookings"),
        reschedule: hasPermission("reschedule"),
        createdTicket: hasPermission("createdTicket"),
        imprimerTicket: hasPermission("imprimerTicket"),
        cancelledTicket: hasPermission("cancelledTicket"),
        manifestPdf: hasPermission("manifestPdf"),
        rapport: hasPermission("rapport"),
        refunds: hasPermission("refunds"),
        locations: hasPermission("locations"),
        promoCodes: hasPermission("promoCodes"),
    };
};
