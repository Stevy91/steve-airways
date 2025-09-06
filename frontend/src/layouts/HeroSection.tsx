import { Link } from "react-router-dom";

import { useTranslation } from "react-i18next";
import Topbar from "./TopBar";
import { Navbar } from "./NavBar";

export const HeroSection = () => {
  const { t } = useTranslation();

  return (
    <section className="relative w-full  overflow-hidden">
      {/* Topbar + Navbar dans un parent */}
      <div className="relative z-[9999]">
        <Navbar />
      </div>

    </section>
  )
}


