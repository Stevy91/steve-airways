import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';


export const Footer: React.FC = () => {
        const { lang } = useParams<{ lang: string }>();
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(lang || "en");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-blue-950 text-white pt-10 pb-6 px-4 md:px-8 mt-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* LOGO + DESCRIPTION */}
        <div>
          <Link to={`/${currentLang}/`} className="flex items-center mb-4">
            <img src="/logo.png" alt="Trogon Airways" className="w-12 mr-2" />
            <span className="text-xl font-bold">Trogon Airways</span>
          </Link>
          <p className="text-sm text-gray-300">
           {t('Premium air travel for your business, leisure and charter needs.')}
          </p>
        </div>

        {/* QUICK LINKS */}
        <div>
          <h4 className="text-lg font-semibold mb-4">{t('Quick Links')}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to={`/${currentLang}/`} className="hover:text-gray-200">{t('Home')}</Link></li>
            <li><Link to={`/${currentLang}/info`} className="hover:text-gray-200">{t('Travel Info')}</Link></li>
            <li><Link to={`/${currentLang}/support`} className="hover:text-gray-200">{t('Support')}</Link></li>
          </ul>
        </div>

        {/* CONTACT */}
        <div>
          <h4 className="text-lg font-semibold mb-4">{t('Contact')}</h4>
          <p className="text-sm mb-2">
            <i className="fa-solid fa-envelope mr-2"></i>
            <Link to="/mailto:contact@trogonairways.com" className="hover:underline">info@trogonairways.com</Link>
          </p>
          <p className="text-sm mb-2">
            <i className="fa-solid fa-phone mr-2"></i>
            <a href="tel:+50933410404" className="hover:underline">+509 3341 0404</a>
          </p>
          <div className="mb-4">
            
          </div>
          <div className="flex space-x-3">
            <Link to={"https://web.facebook.com/profile.php?id=61578561909061"} target="_blank" rel="noopener noreferrer" className="hover:text-gray-200">
              <i className="fa-brands fa-facebook-f text-lg"></i>
            </Link>
            <Link to="https://www.instagram.com/trogonairways?igsh=MWhtbHhjMjBrczZmaQ==" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200">
              <i className="fa-brands fa-instagram text-lg"></i>
            </Link>
            <Link to={"https://x.com/TrogonAirways"} target="_blank" rel="noopener noreferrer" className="hover:text-gray-200">
              <i className="fa-brands fa-x-twitter text-lg"></i>
            </Link>
          </div>
        </div>

          {/* LEGAL INFO */}
        <div>
          <h4 className="text-lg font-semibold mb-4">{t('Legal')}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to={`/${currentLang}/terms`} className="hover:text-gray-200">{t('Terms Of Service')}</Link></li>
            <li><Link to={`/${currentLang}/privacy`} className="hover:text-gray-200">{t('Privacy Policy')}</Link></li>
            <li><Link to={`/${currentLang}/cookies`} className="hover:text-gray-200">{t('Cookie Policy')}</Link></li>
          </ul>
        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="border-t border-gray-700 mt-10 pt-4 text-center text-sm text-gray-400">
        &copy; {currentYear} Trogon Airways. {t('All Rights Reserved')}
      </div>
    </footer>
  );
};
