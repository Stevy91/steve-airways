"use client";
import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { FacebookIcon, InstagramIcon, GlobeIcon, Phone, ChevronDown, MenuIcon, XIcon } from "lucide-react";
import { headerHomeLinks, headerMobilLinks } from "../constants";

const HeaderHomePage = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 100;
            if (isScrolled !== scrolled) {
                setScrolled(isScrolled);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [scrolled]);

    return (
        <header className={`fixed z-50 w-full transition-all duration-300 ${scrolled ? "bg-white shadow-md" : "bg-transparent"}`}>
            {/* Top Header - Transparent by default, disappears when scrolled */}
            <div
                className={`overflow-hidden border-b border-zinc-400 transition-all duration-300 ${scrolled ? "h-0 opacity-0" : "h-auto py-2 opacity-100"}`}
            >
                <div className="container mx-auto flex items-center justify-between px-4 text-sm text-white">
                    <div className="flex items-center space-x-4">
                        <FacebookIcon className="h-4 w-4 cursor-pointer hover:text-blue-300" />
                        <InstagramIcon className="h-4 w-4 cursor-pointer hover:text-pink-300" />
                        <span>reservation@trogonairways.com</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                            <Phone className="mr-1 h-4 w-4" />
                            +509 46101010
                        </span>
                        <span className="flex items-center">
                            <GlobeIcon className="mr-1 h-4 w-4" />
                            Creole
                            <ChevronDown className="ml-1 h-4 w-4" />
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Navigation - Transparent by default, becomes solid when scrolled */}
            <nav className={`transition-all duration-300 ${scrolled ? "bg-red-600 py-3 shadow-lg" : "bg-transparent py-4"}`}>
                <div className="container mx-auto flex items-center justify-between px-4">
                    <div className="flex items-center space-x-3">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="h-10"
                        />
                        <span className={`text-lg font-bold ${scrolled ? "text-white" : "text-white"}`}>Trogon Airways</span>
                    </div>

                    <ul className="hidden space-x-2 md:flex">
                        {headerHomeLinks.map((section) =>
                            section.links.map((link) => {
                                const isActive = location.pathname === link.path;
                                return (
                                    <li key={link.path}>
                                        <Link
                                            to={link.path}
                                            className={`flex items-center space-x-1 rounded-full px-4 py-2 transition-colors ${
                                                isActive
                                                    ? scrolled
                                                        ? "bg-white text-red-600"
                                                        : "bg-white bg-opacity-20 text-white"
                                                    : scrolled
                                                      ? "text-white hover:bg-white hover:bg-opacity-20"
                                                      : "text-white hover:bg-white hover:bg-opacity-20"
                                            }`}
                                        >
                                            <link.icon className="h-4 w-4" />
                                            <span>{link.label}</span>
                                        </Link>
                                    </li>
                                );
                            }),
                        )}
                    </ul>

                    <button
                        className={`${scrolled ? "text-white" : "text-white"} md:hidden`}
                        onClick={() => setMenuOpen(true)}
                    >
                        <MenuIcon className="h-8 w-8" />
                    </button>
                </div>
            </nav>

            {/* Mobile Menu */}
            {menuOpen && (
                <div className="fixed inset-0 z-50 bg-white p-6 md:hidden">
                    <div className="mb-6 flex items-center justify-between">
                        <span className="text-lg font-bold">Trogon Airways</span>
                        <button onClick={() => setMenuOpen(false)}>
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>
                    <ul className="space-y-4">
                        {headerMobilLinks.map((section) =>
                            section.links.map((link) => {
                                const isActive = location.pathname === link.path;
                                return (
                                    <li key={link.path}>
                                        <Link
                                            to={link.path}
                                            onClick={() => setMenuOpen(false)}
                                            className={`flex items-center space-x-2 rounded-md px-3 py-2 ${
                                                isActive ? "bg-blue-700 text-white" : "text-gray-800 hover:bg-blue-100"
                                            }`}
                                        >
                                            <link.icon className="h-4 w-4" />
                                            <span>{link.label}</span>
                                        </Link>
                                    </li>
                                );
                            }),
                        )}
                    </ul>
                </div>
            )}
        </header>
    );
};

export default HeaderHomePage;
