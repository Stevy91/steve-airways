"use client";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import BookingForm from "../../components/BookingForm";
import { useState } from "react";

export default function HomePage() {
      const [, setFlights] = useState<any[]>([]);



  // Cette fonction sera appelée par BookingForm avec les résultats
  const handleSearch = (foundFlights: any[]) => {
    setFlights(foundFlights);
  };
    return (
        <div className="font-sans">
            {/* Booking Form Section */}
            <BookingForm onSearch={handleSearch}/>
        </div>
    );
}
