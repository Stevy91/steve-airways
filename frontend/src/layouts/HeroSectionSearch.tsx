import { Link } from "react-router-dom";

import { useTranslation } from "react-i18next";
import Topbar from "./TopBar";
import { Navbar } from "./NavBar";
import { NavbarSearch } from "./NavBarSearch";

export const HeroSectionSearch = () => {
  const { t } = useTranslation();

  return (
    <section className="relative w-full  overflow-hidden">
      {/* Topbar + Navbar dans un parent */}
      <div className="relative z-[9999]">
        <NavbarSearch />
      </div>

    </section>
  )
}


