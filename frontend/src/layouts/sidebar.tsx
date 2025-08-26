import { forwardRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { navbarLinks } from "../constants";
import { cn } from "../utils/cn";
import logoT from "../assets/logoT.png";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SidebarProps {
    collapsed?: boolean;
}

export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(({ collapsed }, ref) => {
    const [openGroup, setOpenGroup] = useState<string | null>(null);

    const toggleGroup = (title: string) => {
        setOpenGroup((prev) => (prev === title ? null : title));
    };

    return (
        <aside
            ref={ref}
            className={cn(
                "fixed z-[100] flex h-full w-[240px] flex-col overflow-x-hidden border-r border-slate-300 bg-white transition-all dark:border-slate-700 dark:bg-slate-900",
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
                {!collapsed && <p className="text-lg font-bold text-slate-900 dark:text-slate-50">Trogon Airways</p>}
            </div>

            <div className="flex w-full flex-col gap-y-4 overflow-y-auto p-3">
                {navbarLinks.map((navbarLink) => {
                    const isDashboard = navbarLink.title === "Dashboard";

                    // S'il n'y a qu'un lien, on le sort pour un lien direct
                    if (isDashboard && navbarLink.links.length === 1) {
                        const firstLink = navbarLink.links[0];
                        return (
                            <NavLink
                                key={firstLink.label}
                                to={firstLink.path}
                                className={cn(
                                    "sidebar-item flex items-center gap-2 rounded p-2 hover:bg-slate-100 hover:text-black dark:hover:bg-slate-800 dark:hover:text-white",
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

                    // Affichage classique avec sous-menu
                    return (
                        <nav
                            key={navbarLink.title}
                            className={cn("sidebar-group", collapsed && "md:items-center")}
                        >
                            <button
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
                            </button>

                            <div className={cn("ml-3 space-y-1", openGroup !== navbarLink.title && "hidden")}>
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
                })}
            </div>
        </aside>
    );
});

Sidebar.displayName = "Sidebar";
