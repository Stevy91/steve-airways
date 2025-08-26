import { Bell, ChevronsLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/theme-context";
import profileImg from "../assets/profile-image.jpg";
import React, { useState, useRef, useEffect } from "react";

type HeaderProps = {
    collapsed: boolean;
    setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
};

export const Header: React.FC<HeaderProps> = ({ collapsed, setCollapsed }) => {
    const { theme, setTheme } = useTheme();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    const profileRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    const notifications = [
        { id: 1, text: "🔔 Nouvelle commande reçue" },
        { id: 2, text: "👤 Nouvel utilisateur inscrit" },
        { id: 3, text: "⚙️ Paramètres mis à jour" },
        { id: 4, text: "📦 Livraison expédiée" },
        { id: 5, text: "🔄 Mise à jour disponible" },
    ];

    // Fermer les dropdown si clic à l'extérieur
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                profileRef.current &&
                !profileRef.current.contains(event.target as Node) &&
                notifRef.current &&
                !notifRef.current.contains(event.target as Node)
            ) {
                setIsProfileOpen(false);
                setIsNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Ouvrir un seul menu à la fois
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
                {/* <div className="input">
                    <Search
                        size={20}
                        className="text-slate-300"
                    />
                    <input
                        type="text"
                        name="search"
                        id="search"
                        placeholder="Search..."
                        className="w-full bg-transparent text-slate-900 outline-0 placeholder:text-slate-300 dark:text-slate-50"
                    />
                </div> */}
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
                    ref={notifRef}
                    className="relative"
                >
                    <button
                        onClick={toggleNotif}
                        className="btn-ghost relative size-10"
                        aria-label="Toggle notifications"
                    >
                        <Bell size={20} />
                        {/* Badge rouge avec nombre */}
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                            5
                        </span>
                    </button>

                    {isNotifOpen && (
                        <div className="absolute right-0 z-20 mt-2 w-64 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 duration-200 animate-in fade-in zoom-in-95 dark:bg-slate-800">
                            <div className="max-h-48 overflow-auto py-2">
                                {notifications.length === 0 ? (
                                    <p className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Pas de notifications</p>
                                ) : (
                                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {notifications.map((notif) => (
                                            <li
                                                key={notif.id}
                                                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300"
                                            >
                                                {notif.text}
                                            </li>
                                        ))}
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
                        <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 duration-200 animate-in fade-in zoom-in-95 dark:bg-slate-800">
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
