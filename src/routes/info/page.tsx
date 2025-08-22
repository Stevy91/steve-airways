"use client";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

export default function TravelInfoPage() {
    return (
        <div className="font-sans">
            {/* Hero Section */}
            <div
                className="relative h-[400px] bg-cover bg-center"
                style={{ backgroundImage: "url(/plane-bg.jpg)" }}
            >
                <div className="absolute inset-0 z-10 h-[400px] bg-black bg-opacity-40"></div>
                {/* Header */}
                {/* <HeaderHomePage /> */}

                {/* Hero Text */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 text-center text-white">
                    <h1 className="mb-2 text-3xl font-bold sm:text-4xl md:text-5xl">Let's The World Together!</h1>
                    <p className="text-lg font-semibold sm:text-xl">We fly to connect people</p>
                </div>
            </div>

            <div className="text-cente absolute inset-0 z-20 flex flex-col items-center justify-center px-4">
                <h1 className="mb-2 text-3xl font-bold sm:text-4xl md:text-5xl">Let's The World Together!</h1>
                <p className="text-lg font-semibold sm:text-xl">We fly to connect people</p>
            </div>
        </div>
    );
}
