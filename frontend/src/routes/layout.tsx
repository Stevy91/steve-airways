import { Outlet } from "react-router-dom";
import HeaderHomePage from "../layouts/headerHomePage";


const LayoutHome = () => {
    return (
        <div className="min-h-screen">
            {/* Hero Section with Background Image */}
            <div className="relative h-[500px] w-full bg-[url('/home-bg.jpg')] bg-cover bg-center">
                <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                
                {/* Header (transparent by default) */}
                <HeaderHomePage />
                
                {/* Hero Content */}
                <div className="relative z-1 flex items-center justify-center text-center text-white h-[600px] bg-cover bg-center"  style={{ backgroundImage: "url(/plane-bg.jpg)" }}>
                    <div className="px-4">
                        <h1 className="mb-6 text-4xl font-bold md:text-5xl">Trogon Airways</h1>
                        <p className="text-xl">Travel in style</p>
                    </div>
                </div>
            </div>
            
            {/* Main Content */}
            <main className="mx-auto max-w-7xl px-4 py-12">
                <Outlet />
            </main>
        </div>
    );
};

export default LayoutHome;
