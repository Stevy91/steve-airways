import { Bell, Check, ChevronsLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/theme-context";
import profileImg from "../assets/profile-image.jpg";
import React, { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";

type HeaderProps = {
    collapsed: boolean;
    setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
};

interface Notification {
    id: number;
    message: string;
    seen: boolean;
    createdAt?: string;
    created_at?: string;
}

export const Header: React.FC<HeaderProps> = ({ collapsed, setCollapsed }) => {
    const { theme, setTheme } = useTheme();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const profileRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    // Récupérer les notifications au chargement du composant
    const fetchNotifications = async () => {
        try {
            const res = await fetch("https://steve-airways-production.up.railway.app/api/notifications");
            const data = await res.json();
            if (data.success) {
                setNotifications(data.notifications);
                const unread = data.notifications.filter((n: Notification) => !n.seen).length;
                setUnreadCount(unread);
            }
        } catch (error) {
            console.error("Erreur récupération notifications:", error);
        }
    };

    // Écouter les nouvelles notifications via Socket.io
    useEffect(() => {
        fetchNotifications();

        const socket = io("https://steve-airways-production.up.railway.app");
        socket.on("new-notification", (notif: Notification) => {
            setNotifications((prev) => [notif, ...prev]);
            setUnreadCount((prev) => prev + 1);
        });

        return () => {
            socket.close();
        };
    }, []);

    // Fermer les dropdown si clic à l'extérieur
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        }
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

    const markAsSeen = async (id: number) => {
        try {
            await fetch(`https://steve-airways-production.up.railway.app/api/notifications/${id}/seen`, {
                method: "PATCH",
            });

            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, seen: true } : n)));

            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Erreur marquer comme lu:", error);
        }
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
                <button
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
                </button>

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
                            <div className="max-h-48 overflow-auto py-2">
                                <ul>
                                    {notifications.map((n) => {
                                        const dateStr = n.createdAt || n.created_at;
                                        return (
                                            <li
                                                key={n.id}
                                                className="flex items-center justify-between py-2"
                                                style={{ fontWeight: n.seen ? "normal" : "bold" }}
                                            >
                                                <span>
                                                    {n.message} - {dateStr ? new Date(dateStr).toLocaleString() : "Date inconnue"}
                                                </span>
                                                {!n.seen && (
                                                    <button
                                                        className="ml-4 rounded-xl bg-orange-700 p-1"
                                                        onClick={() => markAsSeen(n.id)}
                                                    >
                                                        <Check className="h-5 w-5 text-white" />
                                                    </button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Profil */}
                <div
                    ref={profileRef}
                    className="relative"
                >
                    <button
                        onClick={toggleProfile}
                        className="size-10 overflow-hidden rounded-full ring-2 ring-transparent transition focus:outline-none focus:ring-blue-500"
                        aria-label="Toggle profile menu"
                    >
                        <img
                            src={profileImg}
                            alt="profile"
                            className="size-full object-cover"
                        />
                    </button>

                    {isProfileOpen && (
                        <div className="animate-in fade-in zoom-in-95 absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 duration-200 dark:bg-slate-800">
                            <div className="py-2">
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
                                <a
                                    href="#logout"
                                    className="block px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-red-400"
                                >
                                    Logout
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
