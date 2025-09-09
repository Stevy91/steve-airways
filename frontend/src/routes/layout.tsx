import { Outlet } from "react-router-dom";
import HeaderHomePage from "../layouts/headerHomePage";
import { HeroSection } from "../layouts/HeroSection";

const LayoutHome = () => {
    return (
        <div className="min-h-screen">
            <main className="">
                <Outlet />
            </main>
        </div>
    );
};

export default LayoutHome;
