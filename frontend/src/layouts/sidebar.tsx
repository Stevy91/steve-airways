import { forwardRef, useState, useRef, useEffect } from "react";
import { NavLink, useParams, useLocation, useNavigate } from "react-router-dom";
import { NavbarLinks } from "../constants";
import { cn } from "../utils/cn";
import logoT from "../assets/logoT.png";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useProfile } from "../hooks/useProfile";
import type { LucideProps } from "lucide-react";

interface SidebarProps {
    collapsed?: boolean;
}

interface NavbarLink {
    title: string;
    links: {
        label: string;
        icon: React.ComponentType<LucideProps>;
        path: string;
        requiresAdmin?: boolean;
    }[];
    icon?: React.ComponentType<LucideProps>;
    icons?: React.ComponentType<LucideProps>[];
    requiresAdmin?: boolean;
}

export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(({ collapsed }, ref) => {
    const [openGroup, setOpenGroup] = useState<string | null>(null);
    const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [groupPositions, setGroupPositions] = useState<Record<string, { top: number; height: number; index: number }>>({});
    const [isLeaving, setIsLeaving] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const submenuRef = useRef<HTMLDivElement>(null);
    const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const leaveTimer = useRef<NodeJS.Timeout | null>(null);
    
    const { lang } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const linksData = NavbarLinks(lang || "en");
    const user = useProfile();

    const links: NavbarLink[] = linksData.filter((link): link is NavbarLink => 
        Boolean(link) && typeof link === 'object' && 'title' in link
    );

    useEffect(() => {
        const updatePositions = () => {
            if (!collapsed) return;
            
            const positions: Record<string, { top: number; height: number; index: number }> = {};
            
            const sidebarRect = sidebarRef.current?.getBoundingClientRect();
            if (!sidebarRect) return;
            
            links.forEach((navbarLink, index) => {
                const element = groupRefs.current[navbarLink.title];
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const top = rect.top - sidebarRect.top;
                    positions[navbarLink.title] = {
                        top: top,
                        height: rect.height,
                        index: index
                    };
                }
            });
            
            setGroupPositions(positions);
        };

        updatePositions();
        window.addEventListener('scroll', updatePositions);
        window.addEventListener('resize', updatePositions);

        return () => {
            window.removeEventListener('scroll', updatePositions);
            window.removeEventListener('resize', updatePositions);
        };
    }, [collapsed, links, hoveredGroup]);

    useEffect(() => {
        return () => {
            if (leaveTimer.current) clearTimeout(leaveTimer.current);
        };
    }, []);

    const toggleGroup = (title: string) => {
        if (!collapsed) {
            setOpenGroup((prev) => (prev === title ? null : title));
        }
    };

    const handleGroupMouseEnter = (title: string) => {
        if (collapsed) {
            if (leaveTimer.current) {
                clearTimeout(leaveTimer.current);
                leaveTimer.current = null;
            }
            
            setIsLeaving(false);
            setHoveredGroup(title);
        }
    };

    const handleGroupMouseLeave = () => {
        if (collapsed && hoveredGroup) {
            leaveTimer.current = setTimeout(() => {
                if (!isLeaving) {
                    setIsLeaving(true);
                    setHoveredGroup(null);
                }
            }, 300);
        }
    };

    const handleSubmenuMouseEnter = () => {
        if (leaveTimer.current) {
            clearTimeout(leaveTimer.current);
            leaveTimer.current = null;
        }
        setIsLeaving(false);
    };

    const handleSubmenuMouseLeave = () => {
        if (collapsed && hoveredGroup) {
            leaveTimer.current = setTimeout(() => {
                setIsLeaving(true);
                setHoveredGroup(null);
            }, 200);
        }
    };

    const isMainDashboard = (link: { label: string; path: string }) => {
        return link.path === `/${lang}/dashboard` || link.label === "Dashboard";
    };

    const isLinkActive = (path: string) => {
        return location.pathname === path;
    };

    const isAdmin = user?.role === 'admin';

    const getHoveredGroupPosition = () => {
        if (!hoveredGroup || !groupPositions[hoveredGroup]) {
            return { top: 100, offset: 0 };
        }
        
        const position = groupPositions[hoveredGroup];
        const sidebarHeaderHeight = 80;
        const actualTop = position.top + sidebarHeaderHeight + (position.height / 2);
        
        return {
            top: actualTop,
            offset: position.height / 2
        };
    };

    // SOLUTION AMÉLIORÉE : Utiliser window.location.href pour forcer le rechargement
    const handleSubmenuLinkClick = (path: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Fermer le sous-menu immédiatement
        setHoveredGroup(null);
        
        // Option 1: Forcer un rechargement complet (sûr mais moins fluide)
        if (location.pathname === path) {
            // Si on est déjà sur la page, forcer un rechargement
            window.location.reload();
        } else {
            // Sinon, naviguer vers la nouvelle page avec rechargement
            window.location.href = path;
        }
        
        // Option 2: Utiliser navigate avec un timeout (peut ne pas fonctionner avec votre Topbar)
        // setTimeout(() => {
        //     navigate(path);
        // }, 0);
    };

    // Fonction alternative qui fonctionne avec votre Topbar
    const handleLinkClick = (path: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Fermer le sous-menu
        setHoveredGroup(null);
        
        // Créer un nouvel événement de navigation
        const navEvent = new CustomEvent('forceNavigation', { 
            detail: { path } 
        });
        window.dispatchEvent(navEvent);
        
        // Utiliser une approche hybride
        if (location.pathname === path) {
            window.location.reload();
        } else {
            // Utiliser window.location.assign pour une navigation sûre
            setTimeout(() => {
                window.location.assign(path);
            }, 10);
        }
    };

    return (
        <>
            <aside
                ref={(node) => {
                    sidebarRef.current = node;
                    if (typeof ref === 'function') {
                        ref(node);
                    } else if (ref) {
                        ref.current = node;
                    }
                }}
                className={cn(
                    "fixed z-40 flex h-full flex-col overflow-x-hidden border-r border-slate-300 bgSidebar transition-all duration-300 dark:border-slate-700",
                    collapsed ? "md:w-[80px] md:items-center" : "md:w-[260px]",
                    collapsed ? "max-md:-left-full w-[80px]" : "max-md:left-0 w-[260px]",
                )}
                style={{
                    backgroundImage: `radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                                    radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)`,
                }}
            >
                {/* Logo avec effet de verre */}
                <div className="flex gap-x-3 p-4 border-b   backdrop-blur-sm">
                    <div className="relative">
                        {collapsed ? (
                            <img
                                src={logoT}
                                alt="Logo"
                                className="dark:hidden h-10 w-24 rounded-lg transition-transform duration-300 hover:scale-110"
                            />
                        ) : (
                            <img
                                src={logoT}
                                alt="Logo"
                                className="dark:hidden h-18 w-24 rounded-lg transition-transform duration-300 hover:scale-110"
                            />
                        )}
                        <img
                            src={logoT}
                            alt="Logo"
                            className="hidden dark:block h-10 w-24 rounded-lg transition-transform duration-300 hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 hover:opacity-20 rounded-lg transition-opacity duration-300" />
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <p className="text-lg font-bold text-white dark:text-slate-50">
                                Trogon Airways
                            </p>
                        </div>
                    )}
                </div>

                {/* Navigation avec espacement amélioré */}
                <div className="flex-1 w-full flex flex-col gap-y-2 overflow-y-auto p-4 sidebar-scrollbar">
                    {links.map((navbarLink) => {
                        const isDashboardGroup = navbarLink.title === "Dashboard";

                        if (navbarLink.requiresAdmin && !isAdmin) {
                            return null;
                        }

                        if (isDashboardGroup && isAdmin && navbarLink.links.length === 1) {
                            const firstLink = navbarLink.links[0];
                            return (
                                <NavLink
                                    key={firstLink.label}
                                    to={firstLink.path}
                                    className={({ isActive }: { isActive: boolean }) => cn(
                                        "sidebar-item-dashboard group relative flex items-center gap-3 rounded-xl p-3 text-base font-medium transition-all duration-300",
                                        "hover:bg-gradient-to-r hover:from-purple-500 hover:to-bluee-500 hover:shadow-lg hover:scale-[1.02]",
                                        "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r before:from-blue-500 before:to-purple-500 before:opacity-0 before:transition-opacity before:duration-300",
                                        "hover:before:opacity-10",
                                        isActive && "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg scale-[1.02]",
                                        collapsed ? "mx-auto h-[50px] w-[50px] justify-center" : "w-full justify-start",
                                    )}
                                    onMouseEnter={() => setHoveredItem(firstLink.label)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                >
                                    <div className="relative z-10 flex items-center gap-3">
                                        <div className="relative">
                                            <firstLink.icon
                                                size={22}
                                                className={cn(
                                                    "flex-shrink-0 transition-all duration-300",
                                                    "group-hover:scale-110 group-hover:text-white",
                                                    collapsed ? "text-white" : "text-slate-300"
                                                )}
                                            />
                                            <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        </div>
                                        {!collapsed && (
                                            <p className="whitespace-nowrap text-slate-200 group-hover:text-white transition-colors duration-300">
                                                {firstLink.label}
                                            </p>
                                        )}
                                    </div>
                                    
                                    {!collapsed && (
                                        <div className={cn(
                                            "absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-gradient-to-b from-blue-500 to-purple-500 transition-all duration-300",
                                            hoveredItem === firstLink.label ? "opacity-100 scale-y-100" : "opacity-0 scale-y-50"
                                        )} />
                                    )}
                                </NavLink>
                            );
                        }

                        if (isDashboardGroup && !isAdmin) {
                            return (
                                <nav
                                    key={navbarLink.title}
                                    ref={node => {
                                        if (collapsed) {
                                            groupRefs.current[navbarLink.title] = node;
                                        }
                                    }}
                                    className={cn("sidebar-group", collapsed && "md:items-center")}
                                    onMouseEnter={() => handleGroupMouseEnter(navbarLink.title)}
                                    onMouseLeave={handleGroupMouseLeave}
                                >
                                    <button
                                        onClick={() => toggleGroup(navbarLink.title)}
                                        className={cn(
                                            "sidebar-group-title group relative flex w-full items-center gap-2 rounded-xl p-3",
                                            "hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:shadow-md",
                                            "transition-all duration-300 hover:scale-[1.01]",
                                            collapsed ? "mx-auto h-[50px] w-[50px] justify-center" : "justify-between",
                                        )}
                                    >
                                        <span className="flex items-center gap-3">
                                            {navbarLink.icons ? (
                                                <div className="relative flex items-center gap-1">
                                                    {navbarLink.icons.map((Icon: React.ComponentType<LucideProps>, index: number) => (
                                                        <div key={index} className="relative">
                                                            <Icon 
                                                                size={16} 
                                                                className={cn(
                                                                    "transition-all duration-300",
                                                                    "text-slate-400 group-hover:text-white",
                                                                    collapsed && "text-white"
                                                                )}
                                                            />
                                                            <div className="absolute -inset-1 bg-blue-500/10 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : navbarLink.icon ? (
                                                <div className="relative">
                                                    <navbarLink.icon 
                                                        size={18} 
                                                        className={cn(
                                                            "transition-all duration-300",
                                                            "text-slate-400 group-hover:text-white group-hover:scale-110",
                                                            collapsed && "text-white"
                                                        )}
                                                    />
                                                    <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                </div>
                                            ) : null}

                                            {!collapsed && (
                                                <p className="whitespace-nowrap font-medium text-slate-200 group-hover:text-white transition-colors duration-300">
                                                    {navbarLink.title}
                                                </p>
                                            )}
                                        </span>
                                        {!collapsed && (
                                            <ChevronDown 
                                                size={18} 
                                                className={cn(
                                                    "text-slate-400 transition-all duration-300",
                                                    openGroup === navbarLink.title 
                                                        ? "rotate-180 text-white" 
                                                        : "group-hover:scale-110 group-hover:text-white"
                                                )} 
                                            />
                                        )}
                                    </button>

                                    {!collapsed && (
                                        <div className={cn(
                                            "ml-6 space-y-1 overflow-hidden transition-all duration-500",
                                            openGroup === navbarLink.title 
                                                ? "max-h-96 opacity-100 mt-2" 
                                                : "max-h-0 opacity-0"
                                        )}>
                                            {navbarLink.links.map((link) => {
                                                const Icon = link.icon;
                                                if (isMainDashboard(link) || (link.requiresAdmin && !isAdmin)) {
                                                    return null;
                                                }

                                                return (
                                                    <NavLink
                                                        key={link.label}
                                                        to={link.path}
                                                        className={({ isActive }: { isActive: boolean }) => cn(
                                                            "sidebar-item group relative flex items-center gap-3 rounded-lg p-2.5 animate-slideIn",
                                                            "hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10",
                                                            "transition-all duration-300 transform hover:translate-x-1",
                                                            isActive && "bg-gradient-to-r from-blue-500/20 to-purple-500/20",
                                                            collapsed && "md:w-[45px] md:justify-center"
                                                        )}
                                                        onMouseEnter={() => setHoveredItem(link.label)}
                                                        onMouseLeave={() => setHoveredItem(null)}
                                                    >
                                                        <div className="relative">
                                                            <Icon
                                                                size={20}
                                                                className={cn(
                                                                    "flex-shrink-0 transition-all duration-300",
                                                                    "text-slate-400 group-hover:text-white group-hover:scale-110"
                                                                )}
                                                            />
                                                            <div className="absolute -inset-2 bg-blue-500/10 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                        </div>
                                                        {!collapsed && (
                                                            <p className="whitespace-nowrap text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                                                                {link.label}
                                                            </p>
                                                        )}
                                                        
                                                        {!collapsed && (
                                                            <div className={cn(
                                                                "absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300",
                                                                "opacity-0 scale-0",
                                                                hoveredItem === link.label && "opacity-100 scale-100"
                                                            )} />
                                                        )}
                                                    </NavLink>
                                                );
                                            })}
                                        </div>
                                    )}
                                </nav>
                            );
                        }

                        return (
                            <nav
                                key={navbarLink.title}
                                ref={node => {
                                    if (collapsed) {
                                        groupRefs.current[navbarLink.title] = node;
                                    }
                                }}
                                className={cn("sidebar-group", collapsed && "md:items-center")}
                                onMouseEnter={() => handleGroupMouseEnter(navbarLink.title)}
                                onMouseLeave={handleGroupMouseLeave}
                            >
                                <button
                                    onClick={() => toggleGroup(navbarLink.title)}
                                    className={cn(
                                        "sidebar-group-title group relative flex w-full items-center gap-2 rounded-xl p-3",
                                        "hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:shadow-md",
                                        "transition-all duration-300 hover:scale-[1.01]",
                                        collapsed ? "mx-auto h-[50px] w-[50px] justify-center" : "justify-between",
                                    )}
                                >
                                    <span className="flex items-center gap-3">
                                        {navbarLink.icons ? (
                                            <div className="relative flex items-center gap-1">
                                                {navbarLink.icons.map((Icon: React.ComponentType<LucideProps>, index: number) => (
                                                    <div key={index} className="relative">
                                                        <Icon 
                                                            size={16} 
                                                            className={cn(
                                                                "transition-all duration-300",
                                                                "text-slate-400 group-hover:text-white",
                                                                collapsed && "text-white"
                                                            )}
                                                        />
                                                        <div className="absolute -inset-1 bg-blue-500/10 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : navbarLink.icon ? (
                                            <div className="relative">
                                                <navbarLink.icon 
                                                    size={18} 
                                                    className={cn(
                                                        "transition-all duration-300",
                                                        "text-slate-400 group-hover:text-white group-hover:scale-110",
                                                        collapsed && "text-white"
                                                    )}
                                                />
                                                <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            </div>
                                        ) : null}

                                        {!collapsed && (
                                            <p className="whitespace-nowrap font-medium text-slate-200 group-hover:text-white transition-colors duration-300">
                                                {navbarLink.title}
                                            </p>
                                        )}
                                    </span>
                                    {!collapsed && (
                                        <ChevronDown 
                                            size={18} 
                                            className={cn(
                                                "text-slate-400 transition-all duration-300",
                                                openGroup === navbarLink.title 
                                                    ? "rotate-180 text-white" 
                                                    : "group-hover:scale-110 group-hover:text-white"
                                            )} 
                                        />
                                    )}
                                </button>

                                {!collapsed && (
                                    <div className={cn(
                                        "ml-6 space-y-1 overflow-hidden transition-all duration-500",
                                        openGroup === navbarLink.title 
                                            ? "max-h-96 opacity-100 mt-2" 
                                            : "max-h-0 opacity-0"
                                    )}>
                                        {navbarLink.links.map((link) => {
                                            const Icon = link.icon;
                                            if (link.requiresAdmin && !isAdmin) {
                                                return null;
                                            }

                                            return (
                                                <NavLink
                                                    key={link.label}
                                                    to={link.path}
                                                    className={({ isActive }: { isActive: boolean }) => cn(
                                                        "sidebar-item group relative flex items-center gap-3 rounded-lg p-2.5 animate-slideIn",
                                                        "hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10",
                                                        "transition-all duration-300 transform hover:translate-x-1",
                                                        isActive && "bg-gradient-to-r from-blue-500/20 to-purple-500/20",
                                                        collapsed && "md:w-[45px] md:justify-center"
                                                    )}
                                                    onMouseEnter={() => setHoveredItem(link.label)}
                                                    onMouseLeave={() => setHoveredItem(null)}
                                                >
                                                    <div className="relative">
                                                        <Icon
                                                            size={20}
                                                            className={cn(
                                                                "flex-shrink-0 transition-all duration-300",
                                                                "text-slate-400 group-hover:text-white group-hover:scale-110"
                                                            )}
                                                        />
                                                        <div className="absolute -inset-2 bg-blue-500/10 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                    </div>
                                                    {!collapsed && (
                                                        <p className="whitespace-nowrap text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                                                            {link.label}
                                                        </p>
                                                    )}
                                                    
                                                    {!collapsed && (
                                                        <div className={cn(
                                                            "absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300",
                                                            "opacity-0 scale-0",
                                                            hoveredItem === link.label && "opacity-100 scale-100"
                                                        )} />
                                                    )}
                                                </NavLink>
                                            );
                                        })}
                                    </div>
                                )}
                            </nav>
                        );
                    })}
                </div>

                {!collapsed && user && (
                    <div className="p-4 border-t border-slate-700/50 backdrop-blur-sm bg-slate-800/30">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold">
                                    {(user?.name?.[0] || 'U').toUpperCase()}
                                </span>
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-white truncate">
                                    {user?.name || 'Utilisateur'}
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                    {isAdmin ? 'Administrateur' : 'Agent'} • {user?.email || ''}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* Sous-menu flottant pour mode collapsed */}
            {collapsed && hoveredGroup && (
                <div
                    ref={submenuRef}
                    className="fixed z-[99]"
                    style={{
                        left: '80px',
                        top: `${getHoveredGroupPosition().top}px`,
                        transform: 'translateY(-50%)'
                    }}
                    onMouseEnter={handleSubmenuMouseEnter}
                    onMouseLeave={handleSubmenuMouseLeave}
                >
                    <div className="relative">
                        <div className="absolute left-[-10px] top-1/2 transform -translate-y-1/2">
                            <div className="w-0 h-0 border-t-[10px] border-b-[10px] border-l-[10px] border-t-transparent border-b-transparent border-l-slate-800"></div>
                        </div>
                        
                        <div className="relative left-0 w-64 bg-gradient-to-b from-slate-900 to-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden animate-slideInRight">
                            <div className="p-4 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
                                <h3 className="text-lg font-bold text-white">
                                    {links.find(link => link.title === hoveredGroup)?.title}
                                </h3>
                            </div>

                            <div className="p-3 max-h-[400px] overflow-y-auto sidebar-scrollbar">
                                {(() => {
                                    const currentGroup = links.find(link => link.title === hoveredGroup);
                                    if (!currentGroup) return null;

                                    return currentGroup.links.map((link) => {
                                        const Icon = link.icon;
                                        if (link.requiresAdmin && !isAdmin) {
                                            return null;
                                        }

                                        if (currentGroup.title === "Dashboard" && !isAdmin && isMainDashboard(link)) {
                                            return null;
                                        }

                                        const active = isLinkActive(link.path);

                                        return (
                                            <button
                                                key={link.label}
                                                type="button"
                                                className={cn(
                                                    "group relative flex items-center gap-3 rounded-lg p-3 mb-1 w-full text-left",
                                                    "hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20",
                                                    "transition-all duration-300 transform hover:translate-x-1",
                                                    active && "bg-gradient-to-r from-blue-500/30 to-purple-500/30",
                                                )}
                                                onMouseEnter={() => setHoveredItem(link.label)}
                                                onMouseLeave={() => setHoveredItem(null)}
                                                onClick={(e) => handleLinkClick(link.path, e)} // Utiliser la nouvelle fonction
                                            >
                                                <div className="relative">
                                                    <Icon
                                                        size={20}
                                                        className={cn(
                                                            "flex-shrink-0 transition-all duration-300",
                                                            "text-slate-300 group-hover:text-white group-hover:scale-110",
                                                            active && "text-white"
                                                        )}
                                                    />
                                                    <div className="absolute -inset-2 bg-blue-500/10 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="whitespace-nowrap text-sm font-medium text-slate-200 group-hover:text-white transition-colors duration-300">
                                                        {link.label}
                                                    </p>
                                                </div>
                                                
                                                {active && (
                                                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
                                                )}
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});

Sidebar.displayName = "Sidebar";