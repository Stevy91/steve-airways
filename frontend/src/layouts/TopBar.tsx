import { ChevronDown, FacebookIcon, InstagramIcon, Phone, TwitchIcon, Twitter } from "lucide-react";
import React from "react";
import { useState, useEffect } from "react"
import { useTranslation } from 'react-i18next';

import { Link, useParams } from "react-router-dom";

export const Topbar: React.FC = () => {
 
    
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
      const [languageOpen, setLanguageOpen] = useState(false);
    const { lang } = useParams<{ lang: string }>();
    const { t, i18n } = useTranslation();
    const [currentLang, setCurrentLang] = useState(lang || "en");

    useEffect(() => {
        if (lang) i18n.changeLanguage(lang);
    }, [lang]);
  
          useEffect(() => {
          const handleScroll = () => {
          setIsScrolled(window.scrollY > 400);
          };
  
          window.addEventListener("scroll", handleScroll);
          return () => window.removeEventListener("scroll", handleScroll);
          }, []);

              const handleLanguageChange = (selected: string) => {
        setLanguageOpen(false);

        let newLang = "en";
        switch (selected) {
            case "English":
                newLang = "en";
                break;
            case "Français":
                newLang = "fr";
                break;
        }

        i18n.changeLanguage(newLang);
        setCurrentLang(newLang);

        // Conserver le path + query params
        const pathParts = window.location.pathname.split("/").slice(2);
        const newPath = `/${newLang}/${pathParts.join("/")}${window.location.search}`;
        window.history.replaceState(null, "", newPath);
    };
    return (
      <div className="hidden md:block">
        <div className={`fixed top-0 left-0 right-0 h-10 z-40 text-white text-sm py-2 px-4 flex justify-between items-center border-b border-white backdrop-blur-lg  ${isScrolled ? "bg-blue-950" : "bg-transparent text-white border-white/10"}`}>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-3">
                
                        
              <Link to={"https://web.facebook.com/profile.php?id=61578561909061"} className="hover:text-gray-200" target="_blank">
                <FacebookIcon className="h-4 w-4 cursor-pointer hover:text-blue-300" />
              </Link>
              <Link to={"https://www.instagram.com/trogonairways?igsh=MWhtbHhjMjBrczZmaQ=="} className="hover:text-gray-200" target="_blank">
                <InstagramIcon className="h-4 w-4 cursor-pointer hover:text-pink-300" />
              </Link>
              <Link to={"https://x.com/TrogonAirways"} className="hover:text-gray-200" target="_blank">
                <Twitter className="h-4 w-4 cursor-pointer hover:text-pink-300" />
              </Link>
              <span className="h-5 border-l border-gray-200"></span>
              <Link to={"mailto:info@trogonairways.com"} className="hover:text-white" target="_blank">
                info@trogonairways.com
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <a href="tel:+50933410404" className="hover:text-white">
                <span className="flex items-center">
                    <Phone className="mr-1 h-4 w-4" />
                    +509 3341 0404
                </span>
            </a>
            {/* <a href="#" className="hover:text-white">
              <i className="fa-solid fa-bell pr-2"></i>
            </a> */}
            
            {/* <a href="#" className="hover:text-white">
              <i className="fa-solid fa-user pr-2"></i> {t('login')}
            </a> */}
            {/* <a href="#" className="hover:text-white">
              <i className="fa-solid fa-cart-shopping pr-2"></i>
            </a> */}
                                    <div className="relative">
                            <button
                                onClick={() => setLanguageOpen(!languageOpen)}
                                className="flex items-center rounded-md px-2 py-1 text-white"
                            >
                                <img
                                    src={currentLang === "en" ? "/assets/flag/us.png" : "/assets/flag/fr.png"}
                                    alt={currentLang}
                                    className="mr-2 h-5 w-5"
                                />
                                {currentLang.toUpperCase()}
                                <ChevronDown className="ml-1 h-4 w-4" />
                            </button>

                            {languageOpen && (
                                <ul className="absolute right-0 z-[9999] mt-2 w-32 rounded-md bg-white text-black shadow-md">
                                    <li
                                        onClick={() => handleLanguageChange("English")}
                                        className="flex cursor-pointer items-center px-3 py-2 hover:bg-gray-200"
                                    >
                                        <img
                                            src="/assets/flag/us.png"
                                            alt="English"
                                            className="mr-2 h-5 w-5"
                                        />
                                        English
                                    </li>
                                    <li
                                        onClick={() => handleLanguageChange("Français")}
                                        className="flex cursor-pointer items-center px-3 py-2 hover:bg-gray-200"
                                    >
                                        <img
                                            src="/assets/flag/fr.png"
                                            alt="Français"
                                            className="mr-2 h-5 w-5"
                                        />
                                        Français
                                    </li>
                                </ul>
                            )}
                        </div>
            
          </div>
        </div>
    </div>
  )
}
export default Topbar;
