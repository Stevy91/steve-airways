import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
const SENDER_EMAIL = "info@kashpaw.com"; // A reasonable "from" address
import { format, parseISO } from 'date-fns';
interface Passenger {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
}

interface FlightSegment {
    id: number;
    flightId: number;
    from: string;
    to: string;
    date: string;
    departure_time: string;
    arrival_time: string;
    price: number;
    noflight: string;
}

interface BookingData {
    outbound: FlightSegment;
    return?: FlightSegment;
    passengers: {
        adults: number;
        children: number;
        infants: number;
    };
    passengersData: {
        adults: Passenger[];
        children: Passenger[];
        infants: Passenger[];
    };
    tripType: string;
    tabType: string;
    totalPrice: number;
    fromCity: string;
    toCity: string;
    from: string;
    to: string;
    bookingReference?: string;
}

const Stepper = ({ currentStep }: { currentStep: number }) => {
    return (
        <div className="relative mb-10 px-6">
            <div className="absolute left-[14%] right-[14%] top-2 z-0 h-0.5 bg-blue-500" />
            <div className="relative z-10 flex items-center justify-between">
                {["Flight", "Passenger", "Pay", "Confirmation"].map((step, idx) => {
                    const isCompleted = idx < currentStep;
                    const isActive = idx === currentStep;

                    return (
                        <div
                            key={idx}
                            className="flex w-1/4 flex-col items-center text-center text-sm"
                        >
                            <div
                                className={`relative z-10 mb-2 h-4 w-4 rounded-full border-2 ${
                                    isActive
                                        ? "border-blue-500 bg-red-500"
                                        : isCompleted
                                          ? "border-blue-500 bg-blue-500"
                                          : "border-blue-500 bg-slate-50"
                                }`}
                            >
                                {isCompleted && (
                                    <svg
                                        className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 transform text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={3}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                )}
                            </div>
                            <span
                                className={`whitespace-nowrap ${
                                    isActive ? "font-bold text-blue-500" : isCompleted ? "text-blue-500" : "text-blue-500"
                                }`}
                            >
                                {step}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const printStyles = `
  @media print {
    body * {
      visibility: hidden;
      margin: 0;
      padding: 0;
    }
    .print-section, .print-section * {
      visibility: visible;
    }
    .print-section {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      padding: 10px;
      background: white;
      font-size: 12px;
    }
    .no-print {
      display: none !important;
    }
    .stepper {
      display: none !important;
    }
    .flight-grid {
      grid-template-columns: 1fr !important;
      gap: 10px !important;
    }
    .flight-card {
      padding: 10px !important;
      margin-bottom: 10px !important;
    }
    .passenger-table th, 
    .passenger-table td {
      padding: 4px 8px !important;
      font-size: 10px !important;
    }
    h1 {
      font-size: 18px !important;
    }
    h2 {
      font-size: 14px !important;
      margin: 10px 0 !important;
    }
    .payment-summary {
      margin-top: 10px !important;
      padding: 10px !important;
    }
  }
`;

const generateEmailContent = (bookingData: BookingData, bookingReference: string): string => {
    const outboundFlight = bookingData.outbound;
    const returnFlight = bookingData.return;
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${bookingReference}&code=Code128&dpi=96`;
      const formatDateTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy, p'); 
    } catch (e) {
      return 'Invalid Date';
    }
  };
   const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid Date';
    }
  };

    return `
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f0f7ff; padding: 20px; text-align: center; border-radius: 5px; }
        .flight-card { border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin-bottom: 20px; }
        .flight-header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .flight-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .passenger-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .passenger-table th, .passenger-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .passenger-table th { background-color: #f2f2f2; }
        .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; }
      </style>
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #1A237E; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-family: 'Times New Roman', Times, serif;">Trogon Airways</h1>
        <p style="margin: 5px 0 0; font-size: 1.2em;">Your Booking is Confirmed</p>
      </div>

      <div style="padding: 20px;">
        <p></p>DEAR, ${bookingData.passengersData?.adults?.map((passenger: Passenger) => `${passenger.firstName} ${passenger.lastName}`)}</p>
       
        <p>Thank you for choosing Trogon Airways. Please find your e-ticket below. We recommend printing this section or having it available on your mobile device at the airport.</p>
      </div>

      <!-- E-Ticket Section -->
      <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 20px;">
        <div style="background: #f9f9f9; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
          <table width="100%" style="border-collapse: collapse;">
            <tr>
              <td style="padding-bottom: 20px; border-bottom: 1px solid #eee;">
                <img src="https://storage.googleapis.com/trogon-airways.appspot.com/trogon-logo.png" alt="" style="height: 40px; vertical-align: middle;">
                <span style="font-size: 1.5em; font-weight: bold; color: #1A237E; vertical-align: middle; margin-left: 10px;">Boarding Pass</span>
              </td>
              <td style="padding-bottom: 20px; border-bottom: 1px solid #eee; text-align: right;">
                <img src="${barcodeUrl}" alt="Booking Barcode" style="height: 50px;">
              </td>
            </tr>
            <tr>
             
                <table width="100%">
                  <tr>
                    <td>
                      <h3 style="color: #1A237E; margin: 0;">Itinerary</h3>
                      <div class="flight-card">
                        <div class="flight-header">Outbound Flight</div>
                        <div class="flight-details">
                            <div>
                            <strong>From:</strong> ${bookingData.fromCity} (${bookingData.from})<br>
                            <strong>To:</strong> ${bookingData.toCity} (${bookingData.to})<br>
                            <strong>Date:</strong> ${new Date(outboundFlight.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                            </div>
                            <div>
                            <strong>Departure:</strong> ${outboundFlight.departure_time}<br>
                            <strong>Arrival:</strong> ${outboundFlight.arrival_time}<br>
                            <strong>Flight Number:</strong> ${outboundFlight.noflight}
                            </div>
                        </div>
                        </div>
                    </td>
                    <td style="text-align: right;">
                         ${
                             returnFlight
                                 ? `
                        <div class="flight-card">
                        <div class="flight-header">Return Flight</div>
                        <div class="flight-details">
                            <div>
                            <strong>From:</strong> ${bookingData.toCity} (${bookingData.to})<br>
                            <strong>To:</strong> ${bookingData.fromCity} (${bookingData.from})<br>
                            <strong>Date:</strong> ${new Date(returnFlight.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                            </div>
                            <div>
                            <strong>Departure:</strong> ${returnFlight.departure_time}<br>
                            <strong>Arrival:</strong> ${returnFlight.arrival_time}<br>
                            <strong>Flight Number:</strong> ${returnFlight.noflight}
                            </div>
                        </div>
                        </div>
                        `: ""
                         }
                    </td>
                  </tr>
                </table>
        
            </tr>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 20px; border-top: 1px solid #eee;">
                <h3 style="color: #1A237E; margin: 0 0 10px 0;">Passengers</h3>
            
                 <p style="margin: 0;">${bookingData.passengersData?.adults?.map((passenger: Passenger) => `Adult: ${passenger.firstName} ${passenger.lastName} &nbsp;&nbsp;&nbsp;&nbsp; Email: ${passenger.email} `).join("")}</p>
                 <p style="margin: 0;">${bookingData.passengersData?.children?.map((passenger: Passenger) => `Child: ${passenger.firstName} ${passenger.lastName}`).join("")}</p>
                 <p style="margin: 0;">${bookingData.passengersData?.infants?.map((passenger: Passenger) => `Infant: ${passenger.firstName} ${passenger.lastName}`).join("")}</p>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 20px; border-top: 1px solid #eee;">
                <table width="100%">
                  <tr>
                    <td>
                      <h3 style="color: #1A237E; margin: 0;">Booking Details</h3>
                      <p style="margin: 0; font-size: 0.9em;"><strong>Booking ID:</strong> ${bookingReference}</p>
                      <p style="margin: 0; font-size: 0.9em;"><strong>Booking Date:</strong> ${formatDateTime(outboundFlight.departure_time)}</p>
                    </td>
                    <td style="text-align: right;">
                       <h3 style="color: #1A237E; margin: 0;">Payment</h3>
                       <p style="margin: 0; font-size: 1.1em;"><strong>Total:</strong> $${bookingData.totalPrice.toFixed(2)}</p>
                       <p style="margin: 0; font-size: 0.9em;"><strong>Status:</strong> pay</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </div>
      <!-- End E-Ticket Section -->

      <div style="padding: 20px; font-size: 0.9em; color: #555;">
        <p><strong>Important:</strong> Please arrive at the airport at least 1 hour before your departure time. All passengers must present a valid ID at check-in.</p>
        <p>We look forward to welcoming you on board.</p>
        <p>Sincerely,<br>The Trogon Airways Team</p>
      </div>
    </div>
  `;
};

// const sendTicketByEmail = async (bookingData: BookingData, bookingReference: string): Promise<void> => {
//     try {
//         const emailContent = generateEmailContent(bookingData, bookingReference);
//         const recipientEmail = bookingData.passengersData.adults[0].email;
//         if (!recipientEmail) {
//             throw new Error("Recipient email not found");
//         }

//         const response = await fetch("https://steve-airways-production.up.railway.app/api/send-ticket", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//             },
//             body: JSON.stringify({
//                 to: recipientEmail,
//                 subject: `Your Flight Booking Confirmation - ${bookingReference}`,
//                 html: emailContent,
//                 bookingReference: bookingReference,
//             }),
//         });

//         if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(`Failed to send email: ${errorData.error || JSON.stringify(errorData)}`);
//         }

//         console.log("Email sent successfully");
//     } catch (error) {
//         console.error("Error sending email:", error);
//     }
// };

// const sendTicketByEmail = async (bookingData: BookingData, bookingReference: string) => {
//   const recipientEmail = bookingData.passengersData.adults[0].email;
//   const emailContent = generateEmailContent(bookingData, bookingReference);

//   const response = await fetch("https://steve-airways-production.up.railway.app/api/send-ticket", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       to: recipientEmail,
//       subject: `Your Flight Booking Confirmation - ${bookingReference}`,
//       html: emailContent,
//     }),
//   });

//   if (!response.ok) {
//     const errorData = await response.json();
//     throw new Error(`Failed to send email: ${errorData.error}`);
//   }

//   console.log("Email sent successfully");
// };

const sendTicketByEmail = async (bookingData: BookingData, bookingReference: string) => {
    const apiKey = "api-3E50B3ECEA894D1E8A8FFEF38495B5C4"; // ou process.env.SMTP2GO_API_KEY
    const recipientEmail = bookingData.passengersData.adults[0].email;
    const emailContent = generateEmailContent(bookingData, bookingReference);

    const customerPayload = {
        api_key: apiKey,
        to: [recipientEmail],
        sender: SENDER_EMAIL,
        subject: `Your Trogon Airways E-Ticket - Booking ID: ${bookingReference}`,
        html_body: emailContent,
    };

    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerPayload),
    });

    let responseData;
    try {
        responseData = await response.json();
    } catch (err) {
        const text = await response.text();
        throw new Error(`Failed to send email, non-JSON response: ${text}`);
    }

    if (!response.ok) {
        throw new Error(`Failed to send email: ${responseData?.error || JSON.stringify(responseData)}`);
    }

    console.log("✅ Email sent successfully", responseData);
};

export default function BookingConfirmation() {
    const location = useLocation();
    const navigate = useNavigate();
    const bookingData = location.state?.bookingData as BookingData;
    const paymentMethod = location.state?.paymentMethod;
    const [currentStep] = useState(3);

    useEffect(() => {
        if (!bookingData) {
            navigate("/flights");
        }
    }, [bookingData, navigate]);

    useEffect(() => {
        if (bookingData?.bookingReference) {
            sendTicketByEmail(bookingData, bookingData.bookingReference);
        }
    }, [bookingData]);

    if (!bookingData) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500">No booking data found</p>
                    <button
                        onClick={() => navigate("/flights")}
                        className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
                    >
                        Return to Flights
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative z-10 mt-[-100px] w-full rounded bg-white p-6 shadow-lg">
            <style>{printStyles}</style>

            <Stepper currentStep={currentStep} />

            <div className="w-full">
                <div className="overflow-hidden">
                    <div className="no-print border-t border-gray-200 bg-gray-50 px-6 py-5">
                        <div className="flex justify-between">
                            <button
                                onClick={() => navigate("/")}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Book Another Flight
                            </button>
                            {/* <button
                                onClick={() => handlePrint(bookingData)}
                                className="ml-3 inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Print Confirmation
                            </button> */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
