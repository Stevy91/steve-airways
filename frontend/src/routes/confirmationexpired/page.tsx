// Créez un nouveau composant BookingPending.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

export default function BookingExpired() {
     const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en"; // <-- ici on définit currentLang
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [timeLeft, setTimeLeft] = useState<number>(120); // 2 heures en minutes
  const [bookingData, setBookingData] = useState<any>(null);

  useEffect(() => {
    // Récupérer les données de la réservation
    if (location.state) {
      setBookingData(location.state);
    }

    // Vérifier le statut périodiquement
    const checkStatus = async () => {
      try {
        const response = await fetch(`https://steve-airways.onrender.com/api/booking-status/${bookingId}`);
        const data = await response.json();
        
        if (data.isActive) {
          setTimeLeft(data.minutesRemaining);
        } else {
          // Rediriger si expiré
          navigate(`/${currentLang}/booking-expired`, { 
            state: { bookingReference: data.bookingReference } 
          });
        }
      } catch (error) {
        console.error("Error checking status:", error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Vérifier toutes les 30 secondes

    // Timer local
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 60000); // Mettre à jour chaque minute

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [bookingId, navigate, location.state]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const handleCompletePayment = () => {
    navigate('/complete-payment', { 
      state: { 
        bookingId, 
        totalPrice: bookingData?.totalPrice,
        bookingReference: bookingData?.bookingReference 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Reservation Pending Payment
          </h1>
          <p className="text-gray-600 mb-4">
            Your seats are reserved for:
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="text-center mb-2">
            <div className="text-3xl font-bold text-yellow-700 mb-1">
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-yellow-600">
              Hours:Minutes remaining
            </div>
          </div>
          
          <div className="w-full bg-yellow-200 rounded-full h-2 mb-2">
            <div 
              className="bg-yellow-600 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(timeLeft / 120) * 100}%` }}
            ></div>
          </div>
          
          <p className="text-xs text-yellow-700 text-center">
            Complete payment before the timer reaches zero to confirm your booking
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Booking Reference:</span>
            <span className="font-bold">{bookingData?.bookingReference}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Total Amount:</span>
            <span className="font-bold text-lg">${bookingData?.totalPrice?.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={handleCompletePayment}
          className="w-full mt-6 bg-blue-900 hover:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Complete Payment Now
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          If you don't complete the payment in time, your reservation will be automatically cancelled and the seats will be released.
        </p>
      </div>
    </div>
  );
}