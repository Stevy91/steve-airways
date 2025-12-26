import { forwardRef, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { NavbarLinks } from "../constants";
import { cn } from "../utils/cn";
import logoT from "../assets/logoT.png";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useProfile } from "../hooks/useProfile";

interface SidebarProps {
    collapsed?: boolean;
}

export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(({ collapsed }, ref) => {
    const [openGroup, setOpenGroup] = useState<string | null>(null);
    const { lang } = useParams();
    const links = NavbarLinks(lang || "en");
    const user = useProfile();

    const toggleGroup = (title: string) => {
        setOpenGroup((prev) => (prev === title ? null : title));
    };

    // Fonction pour vérifier si un lien est le Dashboard principal
    const isMainDashboard = (link: any) => {
        return link.path === `/${lang}/dashboard` || link.label === "Dashboard";
    };

    return (
        <aside
            ref={ref}
            className={cn(
                "fixed z-[100] flex h-full w-[240px] flex-col overflow-x-hidden border-r border-slate-300 bgSidebar transition-all dark:border-slate-700 dark:bg-slate-900",
                collapsed ? "md:w-[70px] md:items-center" : "md:w-[240px]",
                collapsed ? "max-md:-left-full" : "max-md:left-0",
            )}
        >
            <div className="flex gap-x-3 p-3">
                <img
                    src={logoT}
                    alt="Logo"
                    className="dark:hidden"
                />
                <img
                    src={logoT}
                    alt="Logo"
                    className="hidden dark:block"
                />
                {!collapsed && <p className="text-lg font-bold text-white dark:text-slate-50">Trogon Airways</p>}
            </div>

            <div className="flex w-full flex-col gap-y-4 overflow-y-auto p-3">
                {links.map((navbarLink) => {
                    const isDashboardGroup = navbarLink.title === "Dashboard";

                    // Vérifier si l'utilisateur est connecté
                    if (!user) return null;

                    // 🔹 CAS 1: SI L'UTILISATEUR EST ADMIN
                    if (user.role === "admin") {
                        // Dashboard spécial pour les admins (lien direct)
                        if (isDashboardGroup && navbarLink.links.length === 1) {
                            const firstLink = navbarLink.links[0];
                            return (
                                <NavLink
                                    key={firstLink.label}
                                    to={firstLink.path}
                                    className={cn(
                                        "sidebar-item-dashboard flex items-center gap-2 rounded p-2 text-base font-medium text-slate-900 hover:bg-slate-100 hover:text-black dark:text-white dark:hover:bg-slate-800 dark:hover:text-white",
                                        collapsed ? "mx-auto h-[45px] w-[45px] justify-center" : "w-full justify-start",
                                    )}
                                >
                                    <firstLink.icon
                                        size={22}
                                        className="flex-shrink-0"
                                    />
                                    {!collapsed && <p className="whitespace-nowrap">{firstLink.label}</p>}
                                </NavLink>
                            );
                        }

                        // Affichage normal pour tous les autres groupes (admin a tout accès)
                        return (
                            <nav
                                key={navbarLink.title}
                                className={cn("sidebar-group", collapsed && "md:items-center")}
                            >
                                <button
                                    onClick={() => toggleGroup(navbarLink.title)}
                                    className={cn(
                                        "sidebar-group-title flex w-full items-center text-white gap-2 rounded p-2 hover:bg-slate-100 hover:text-black dark:hover:bg-slate-800",
                                        collapsed ? "mx-auto h-[45px] w-[45px] justify-center" : "justify-between",
                                    )}
                                >
                                    <span className="text flex items-center gap-2">
                                        {navbarLink.icon && <navbarLink.icon size={18} />}
                                        {!collapsed && navbarLink.title}
                                    </span>
                                    {!collapsed && (openGroup === navbarLink.title ? <ChevronDown size={18} /> : <ChevronRight size={18} />)}
                                </button>

                                <div className={cn("ml-3 space-y-1 ", openGroup !== navbarLink.title && "hidden")}>
                                    {navbarLink.links.map((link) => {
                                        const Icon = link.icon;
                                        return (
                                            <NavLink
                                                key={link.label}
                                                to={link.path}
                                                className={cn("sidebar-item", collapsed && "md:w-[45px]")}
                                            >
                                                <Icon
                                                    size={22}
                                                    className="flex-shrink-0"
                                                />
                                                {!collapsed && <p className="whitespace-nowrap">{link.label}</p>}
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            </nav>
                        );
                    }

                    // 🔹 CAS 2: SI L'UTILISATEUR N'EST PAS ADMIN (user role)
                    else {
                        // Pour le groupe Dashboard, filtrer le lien principal
                        if (isDashboardGroup) {
                            return (
                                <nav
                                    key={navbarLink.title}
                                    className={cn("sidebar-group", collapsed && "md:items-center")}
                                >
                                    {/* <button
                                        onClick={() => toggleGroup(navbarLink.title)}
                                        className={cn(
                                            "sidebar-group-title flex w-full items-center gap-2 rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-800",
                                            collapsed ? "mx-auto h-[45px] w-[45px] justify-center" : "justify-between",
                                        )}
                                    >
                                        <span className="text flex items-center gap-2">
                                            {navbarLink.icon && <navbarLink.icon size={18} />}
                                            {!collapsed && navbarLink.title}
                                        </span>
                                        {!collapsed && (openGroup === navbarLink.title ? <ChevronDown size={18} /> : <ChevronRight size={18} />)}
                                    </button> */}

                                    <div className={cn("ml-3 space-y-1", openGroup !== navbarLink.title && "hidden")}>
                                        {navbarLink.links.map((link) => {
                                            const Icon = link.icon;

                                            // 🔹 FILTRE: Exclure le Dashboard principal pour les non-admins
                                            if (isMainDashboard(link)) {
                                                return null;
                                            }

                                            // Filtrer aussi les autres liens réservés aux admins
                                            if ('requiresAdmin' in link && link.requiresAdmin) {
                                                return null;
                                            }

                                            return (
                                                <NavLink
                                                    key={link.label}
                                                    to={link.path}
                                                    className={cn("sidebar-item", collapsed && "md:w-[45px]")}
                                                >
                                                    <Icon
                                                        size={22}
                                                        className="flex-shrink-0"
                                                    />
                                                    {!collapsed && <p className="whitespace-nowrap">{link.label}</p>}
                                                </NavLink>
                                            );
                                        })}
                                    </div>
                                </nav>
                            );
                        }

                        // Pour les autres groupes, sauter ceux réservés aux admins
                        if ('requiresAdmin' in navbarLink && navbarLink.requiresAdmin) {
                            return null;
                        }

                        // Affichage normal pour les autres groupes accessibles
                        return (
                            <nav
                                key={navbarLink.title}
                                className={cn("sidebar-group", collapsed && "md:items-center")}
                            >
                                <button
                                    onClick={() => toggleGroup(navbarLink.title)}
                                    className={cn(
                                        "sidebar-group-title flex  w-full items-center gap-2 rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-800",
                                        collapsed ? "mx-auto h-[45px] w-[45px] justify-center" : "justify-between",
                                    )}
                                >
                                    <span className="text flex items-center gap-2">
                                        {navbarLink.icon && <navbarLink.icon size={18} />}
                                        {!collapsed && navbarLink.title}
                                    </span>
                                    {!collapsed && (openGroup === navbarLink.title ? <ChevronDown size={18} /> : <ChevronRight size={18} />)}
                                </button>

                                <div className={cn("ml-3 space-y-1", openGroup !== navbarLink.title && "hidden")}>
                                    {navbarLink.links.map((link) => {
                                        const Icon = link.icon;

                                        // Filtrer les liens réservés aux admins
                                        if ('requiresAdmin' in link && link.requiresAdmin) {
                                            return null;
                                        }

                                        return (
                                            <NavLink
                                                key={link.label}
                                                to={link.path}
                                                className={cn("sidebar-item", collapsed && "md:w-[45px]")}
                                            >
                                                <Icon
                                                    size={22}
                                                    className="flex-shrink-0"
                                                />
                                                {!collapsed && <p className="whitespace-nowrap">{link.label}</p>}
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            </nav>
                        );
                    }
                })}
            </div>
        </aside>
    );
});

Sidebar.displayName = "Sidebar";