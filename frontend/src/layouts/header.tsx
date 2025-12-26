import { Bell, ChevronsLeft, Moon, Sun, Check, Trash2, User } from "lucide-react";
import { useTheme } from "../contexts/theme-context";
import profileImg from "../assets/profile-image.jpg";
import React, { useState, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useNavigate, useParams } from "react-router-dom";
import { useProfile } from "../hooks/useProfile";

type HeaderProps = {
    collapsed: boolean;
    setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
};

interface Notification {
    id: number;
    message: string;
    seen: boolean;
    read_at?: string;
    createdAt?: string;
    created_at?: string;
}

export const Header: React.FC<HeaderProps> = ({ collapsed, setCollapsed }) => {
    const { theme, setTheme } = useTheme();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [socket, setSocket] = useState<Socket | null>(null);
    const navigate = useNavigate();
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en"; // <-- ici on définit currentLang

    const profileRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const user = useProfile();

    const handleLogout = async () => {
        try {
            // Appel API logout (optionnel si tu veux juste supprimer le token côté client)
            await fetch("https://steve-airways.onrender.com/api/logout", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            // Supprime le token côté client
            localStorage.removeItem("token");

            // Redirection vers login

            navigate(`/${currentLang}/login`);
        } catch (err) {
            console.error("Erreur logout:", err);
        }
    };

    // Filtrer notifications pour n'afficher que non lues ou lues il y a moins de 2 jours
    const getFilteredNotifications = (notifs: Notification[]) => {
        const now = new Date();
        return notifs.filter((notif) => {
            if (!notif.seen) return true;
            if (notif.read_at) {
                const readDate = new Date(notif.read_at);
                const diffTime = Math.abs(now.getTime() - readDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 2;
            }
            return false;
        });
    };

    // Récupérer notifications et initialiser badge
    const fetchNotifications = async () => {
        try {
            const res = await fetch("https://steve-airways.onrender.com/api/notifications");
            const data = await res.json();
            if (data.success) {
                const filteredNotifs = getFilteredNotifications(data.notifications);
                setNotifications(filteredNotifs);
                const unread = filteredNotifs.filter((n) => !n.seen).length;
                setUnreadCount(unread);
            }
        } catch (error) {
            console.error("Erreur récupération notifications:", error);
        }
    };

    // Nettoyer anciennes notifications
    const cleanupOldNotifications = async () => {
        try {
            await fetch("https://steve-airways.onrender.com/api/notifications/cleanup", { method: "DELETE" });
            fetchNotifications();
        } catch (error) {
            console.error("Erreur nettoyage notifications:", error);
        }
    };

    // Marquer une notification comme lue
    const markAsSeen = async (id: number) => {
        try {
            await fetch(`https://steve-airways.onrender.com/api/notifications/${id}/seen`, { method: "PATCH" });
            setNotifications((prev) => {
                const updated = prev.map((n) => (n.id === id ? { ...n, seen: true, read_at: new Date().toISOString() } : n));
                const filtered = getFilteredNotifications(updated);
                setUnreadCount(filtered.filter((n) => !n.seen).length);
                return filtered;
            });
        } catch (error) {
            console.error("Erreur marquer comme lu:", error);
        }
    };

    // Formater la date relative
    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));

        if (diffDays > 0) return `il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
        if (diffHours > 0) return `il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
        return `il y a ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
    };

    // Initialisation WebSocket
    useEffect(() => {
        const newSocket = io("https://steve-airways.onrender.com");
        setSocket(newSocket);

        newSocket.on("new-notification", (notif: Notification) => {
            setNotifications((prev) => {
                const updated = [notif, ...prev];
                setUnreadCount(updated.filter((n) => !n.seen).length);
                return updated;
            });
        });

        fetchNotifications();
        cleanupOldNotifications();
        const cleanupInterval = setInterval(cleanupOldNotifications, 60 * 60 * 1000);

        return () => {
            newSocket.disconnect();
            clearInterval(cleanupInterval);
        };
    }, []);

    // Fermer dropdowns si clic à l'extérieur
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileOpen(false);
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) setIsNotifOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleProfile = () => {
        setIsProfileOpen(!isProfileOpen);
        if (!isProfileOpen) setIsNotifOpen(false);
    };

    const toggleNotif = () => {
        setIsNotifOpen(!isNotifOpen);
        if (!isNotifOpen) setIsProfileOpen(false);
    };

    return (
        <header className="relative z-10 flex h-[60px] items-center justify-between bg-white px-4 shadow-md transition-colors dark:bg-slate-900">
            <div className="flex items-center gap-x-3">
                <button
                    className="btn-ghost size-10"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <ChevronsLeft className={collapsed ? "rotate-180" : ""} />
                </button>
            </div>

            <div className="relative flex items-center gap-x-3">
                {/* <button
                    className="btn-ghost size-10"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    aria-label="Toggle theme"
                >
                    <Sun
                        size={20}
                        className="dark:hidden"
                    />
                    <Moon
                        size={20}
                        className="hidden dark:block"
                    />
                </button> */}

                {/* Notifications */}
                <div
                    className="relative"
                    ref={notifRef}
                >
                    <button
                        onClick={toggleNotif}
                        className="btn-ghost relative size-10"
                        aria-label="Toggle notifications"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {isNotifOpen && (
                        <div className="animate-in fade-in zoom-in-95 absolute right-0 z-20 mt-2 w-96 origin-top-right rounded-md bg-white p-4 shadow-lg ring-1 ring-black/5 duration-200 dark:bg-slate-800">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="font-semibold">Notifications</h3>
                                <button
                                    onClick={cleanupOldNotifications}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                    title="Nettoyer les anciennes notifications"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="max-h-64 overflow-auto">
                                {notifications.length === 0 ? (
                                    <p className="py-4 text-center text-gray-500">Aucune notification</p>
                                ) : (
                                    <ul>
                                        {notifications.map((n) => {
                                            const dateStr = n.createdAt || n.created_at;
                                            return (
                                                <li
                                                    key={n.id}
                                                    className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0"
                                                    style={{ fontWeight: n.seen ? "normal" : "bold" }}
                                                >
                                                    <div className="flex-1">
                                                        <p className="text-sm">{n.message}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {dateStr ? formatRelativeTime(dateStr) : "Date inconnue"}
                                                        </p>
                                                    </div>
                                                    {!n.seen && (
                                                        <button
                                                            className="ml-4 rounded-xl bg-orange-700 p-1 hover:bg-orange-600"
                                                            onClick={() => markAsSeen(n.id)}
                                                            title="Marquer comme lu"
                                                        >
                                                            <Check className="h-4 w-4 text-white" />
                                                        </button>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profil */}
                <div
                    ref={profileRef}
                    className="relative"
                >
                    <div className="flex gap-4">
                        <span className="pt-2 font-bold">{user ? user.name : "..."}</span>
                        <button
                            onClick={toggleProfile}
                            className="size-10 overflow-hidden rounded-full border bg-slate-500 pl-2 text-center ring-2 ring-transparent transition focus:outline-none focus:ring-blue-500"
                            aria-label="Toggle profile menu"
                        >
                            <User className="h-5 w-5 text-blue-500" />
                        </button>
                    </div>

                    {isProfileOpen && user && (
                        <div className="animate-in fade-in zoom-in-95 absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 duration-200 dark:bg-slate-800">
                            <div className="py-2">
                                {/* Afficher Register seulement si user est admin */}
                                {user.role === "admin" && (
                                    <>
                                        <a
                                            href="#profile"
                                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                        >
                                            Edit your profile
                                        </a>
                                        <a
                                            href="#password"
                                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                        >
                                            Change your password
                                        </a>
                                        <button
                                            onClick={() => navigate(`/${currentLang}/register`)}
                                            className="block w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-blue-400"
                                        >
                                            Register new user
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={handleLogout}
                                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-red-400"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
