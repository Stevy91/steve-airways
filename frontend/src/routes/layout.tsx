import { Outlet } from "react-router-dom";
import HeaderHomePage from "../layouts/headerHomePage";

const LayoutHome = () => {
    return (
        <div className="min-h-screen">
            {/* Hero Section with Background Image */}
            <div className="relative w-full bg-cover bg-center">
                <div className="absolute inset-0 bg-black bg-opacity-30"></div>

                {/* Header (transparent by default) */}
                <HeaderHomePage />

                {/* Hero Content */}
            </div>

            {/* Main Content */}
            <main className="">
                <Outlet />
            </main>
        </div>
    );
};

export default LayoutHome;
