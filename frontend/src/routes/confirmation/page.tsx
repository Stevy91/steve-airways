import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
const SENDER_EMAIL = "info@kashpaw.com"; // A reasonable "from" address
import { format, parseISO, isValid } from "date-fns";
import { useTranslation } from "react-i18next";
import { HeroSection } from "../../layouts/HeroSection";
import SessionTimeout from "../../components/SessionTimeout";

interface Passenger {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    created_at: string;
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
    const { t, i18n } = useTranslation();
    return (
        <div className="relative mb-10 px-6">
            <div className="absolute left-[14%] right-[14%] top-2 z-10 hidden h-0.5 bg-blue-900 md:block" />
            <div className="relative z-10 flex items-center justify-between">
                {[t("Flight"), t("Passenger"), t("Pay"), "Confirmation"].map((step, idx) => {
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
                                        ? "border-blue-900 bg-red-900"
                                        : isCompleted
                                          ? "border-blue-900 bg-blue-900"
                                          : "border-blue-900 bg-slate-50"
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
                                    isActive ? "font-bold text-blue-900" : isCompleted ? "text-blue-900" : "text-blue-900"
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

const generateEmailContent = (bookingData: BookingData, bookingReference: string, paymentMethod: string): string => {
    const outboundFlight = bookingData.outbound;
    const returnFlight = bookingData.return;
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${bookingReference}&code=Code128&dpi=96`;

    // --- Helper to format dates ---

    const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A"; // valeur par défaut si undefined
        const parsedDate = parseISO(dateString);
        if (!isValid(parsedDate)) return "Invalid date"; // vérifie que c'est une date valide
        return format(parsedDate, "EEE, dd MMM");
    };

    const formatDateToday = () => format(new Date(), "EEE, dd MMM");
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
        <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px; vertical-align: middle;">
       
        <p style="margin: 5px 0 0; font-size: 1.2em;">Your Booking is Confirmed</p>
      </div>

      <div style="padding: 20px;">
        <p></p>Dear, ${bookingData.passengersData?.adults?.map((passenger: Passenger) => `${passenger.firstName} ${passenger.lastName}`)}</p>
       
        <p>Thank you for choosing Trogon Airways. Please find your e-ticket below. We recommend printing this section or having it available on your mobile device at the airport.</p>
      </div>

      <!-- E-Ticket Section -->
      <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 20px;">
       <div style="padding: 20px; text-align: center;">
 
                <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Payment Method:</strong> ${
                    paymentMethod === "paypal" ? "PayPal" : paymentMethod === "paylater" ? "Pay Later" : "Credit/Debit Card"
                }
</p>
                <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Flight Type:</strong> ${bookingData.tabType === "helicopter" ? "Helicopter" : "Plane"}</p>
               
            </div>
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
              <td colspan="2" style="padding-top: 20px;">
              <h3 style="color: #1A237E; margin: 0;">Itinerary</h3>
              
                <tr>
              <td colspan="2" style="padding-top: 20px;">
                <table width="100%">
                  <tr>
                    <td>
                      
                      <div class="flight-card">
                        <div class="flight-header">Outbound Flight</div>
                        <div class="flight-details">
                            <div>
                            <strong>From:</strong> ${bookingData.fromCity} (${bookingData.from})<br>
                            <strong>To:</strong> ${bookingData.toCity} (${bookingData.to})<br>
                            <strong>Date:</strong> ${formatDate(outboundFlight.date)}
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
                                  <h3 style="color: #1A237E; margin: 0;"></h3>
                        <div class="flight-card">
                        <div class="flight-header">Return Flight</div>
                        <div class="flight-details">
                            <div>
                            <strong>From:</strong> ${bookingData.toCity} (${bookingData.to})<br>
                            <strong>To:</strong> ${bookingData.fromCity} (${bookingData.from})<br>
                            <strong>Date:</strong> ${formatDate(returnFlight.date)}
                            </div>
                            <div>
                            <strong>Departure:</strong> ${returnFlight.departure_time}<br>
                            <strong>Arrival:</strong> ${returnFlight.arrival_time}<br>
                            <strong>Flight Number:</strong> ${returnFlight.noflight}
                            </div>
                        </div>
                        </div>
                        `
                                 : ""
                         }
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 20px; border-top: 1px solid #eee;">
                <h3 style="color: #1A237E; margin: 0 0 10px 0;">Passengers</h3>
            
                 <p style="margin: 0;">${bookingData.passengersData?.adults?.map((passenger: Passenger) => `Adult: ${passenger.firstName} ${passenger.lastName}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${passenger.email} `).join("")}</p>
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
                      <p style="margin: 0; font-size: 0.9em;"><strong>Booking Date:</strong> ${formatDateToday()}
</p>
                    </td>
                    <td style="text-align: right;">
                       <h3 style="color: #1A237E; margin: 0;">Payment</h3>
                       <p style="margin: 0; font-size: 1.1em;"><strong>Total:</strong> $${bookingData.totalPrice.toFixed(2)}</p>
                       <p style="margin: 0; font-size: 0.9em;"><strong>Status: </strong>${paymentMethod === "paypal" ? "Paid" : paymentMethod === "paylater" ? "Unpaid" : "Paid"}</p>
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

const PrintableContent = ({ bookingData, paymentMethod }: { bookingData: BookingData; paymentMethod: string }) => {
    const { t, i18n } = useTranslation();
    const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A"; // valeur par défaut si undefined
        const parsedDate = parseISO(dateString);
        if (!isValid(parsedDate)) return "Invalid date"; // vérifie que c'est une date valide
        return format(parsedDate, "EEE, dd MMM");
    };

    return (
        <div
            className="print-section"
            style={{
                maxWidth: "100%",
                margin: "0 auto",
                padding: "10px",
                boxSizing: "border-box",
            }}
        >
            <h1
                style={{
                    marginBottom: "10px",
                    textAlign: "center",
                    fontSize: "25px",
                    fontWeight: 700,
                }}
                className="text-blue-900"
            >
                Trogon Airways - {t("Booking Confirmation")}
            </h1>

            <div
                style={{
                    marginBottom: "15px",
                    textAlign: "center",
                }}
            >
                <div
                    style={{
                        marginBottom: "5px",
                        display: "inline-flex",
                        height: "30px",
                        width: "30px",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "9999px",
                        backgroundColor: "#dcfce7",
                    }}
                >
                    <CheckCircle2
                        style={{
                            height: "30px",
                            width: "30px",
                            color: "#16a34a",
                        }}
                    />
                </div>
                <h2
                    style={{
                        fontSize: "18px",
                        fontWeight: 700,
                    }}
                >
                    {t("Flight Type")}: {bookingData.tabType === "helicopter" ? t("Helicopter") : t("Air Plane")}
                </h2>
                <h2
                    style={{
                        fontSize: "18px",
                        fontWeight: 700,
                    }}
                >
                    {t("Booking Reference")}: {bookingData.bookingReference}
                </h2>
                <p
                    className="text-blue-900"
                    style={{
                        color: "#4b5563",
                        fontSize: "15px",
                    }}
                >
                    {t("Payment Method")}:{" "}
                    {paymentMethod === "paypal" ? "PayPal" : paymentMethod === "paylater" ? t("Pay Later") : "Credit/Debit Card"}
                </p>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "10px",
                }}
            >
                <div
                    style={{
                        borderRadius: "5px",
                        border: "2px solid #1e3a8a",
                        padding: "10px",
                        pageBreakInside: "avoid",
                    }}
                >
                    <h2
                        style={{
                            marginBottom: "5px",
                            fontSize: "22px",
                            fontWeight: 700,
                            color: "#1f2937",
                        }}
                    >
                        {t("Outbound Flight")}
                    </h2>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            fontSize: "10px",
                        }}
                    >
                        <div
                            style={{
                                flexShrink: 0,
                                paddingTop: "2px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    height: "35px",
                                    width: "35px",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: "9999px",
                                    backgroundColor: "#dbeafe",
                                }}
                            >
                                <svg
                                    style={{
                                        height: "16px",
                                        width: "16px",
                                        color: "#1e3a8a",
                                    }}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M8 7l4-4m0 0l4 4m-4-4v18"
                                    ></path>
                                </svg>
                            </div>
                        </div>
                        <div
                            style={{
                                marginLeft: "8px",
                                flex: 1,
                            }}
                        >
                            <h3
                                style={{
                                    fontSize: "20px",
                                    fontWeight: 500,
                                    color: "#111827",
                                    marginBottom: "4px",
                                }}
                            >
                                {bookingData.fromCity} ({bookingData.from}) {t("to")} {bookingData.toCity} ({bookingData.to})
                            </h3>
                            <p
                                style={{
                                    color: "#1e3a8a",
                                    marginBottom: "4px",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                }}
                            >
                                {formatDate(bookingData.outbound.date)}
                            </p>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "8px",
                                    marginTop: "4px",
                                }}
                            >
                                <div>
                                    <p
                                        style={{
                                            fontSize: "10px",
                                            fontWeight: 500,
                                            color: "#6b7280",
                                            marginBottom: "2px",
                                        }}
                                    >
                                        {t("Departure")}
                                    </p>
                                    <p
                                        style={{
                                            fontWeight: 500,
                                            fontSize: "12px",
                                        }}
                                    >
                                        {bookingData.outbound.departure_time}
                                    </p>
                                </div>
                                <div>
                                    <p
                                        style={{
                                            fontSize: "10px",
                                            fontWeight: 500,
                                            color: "#6b7280",
                                            marginBottom: "2px",
                                        }}
                                    >
                                        {t("Arrival")}
                                    </p>
                                    <p
                                        style={{
                                            fontWeight: 500,
                                            fontSize: "12px",
                                        }}
                                    >
                                        {bookingData.outbound.arrival_time}
                                    </p>
                                </div>
                            </div>
                            <p
                                style={{
                                    marginTop: "4px",
                                    fontSize: "10px",
                                    color: "#6b7280",
                                }}
                            >
                                {t("Flight number")}: {bookingData.outbound.noflight}
                            </p>
                        </div>
                    </div>
                </div>

                {bookingData.return && (
                    <div
                        style={{
                            borderRadius: "5px",
                            border: "2px solid #1e3a8a",
                            padding: "10px",
                            pageBreakInside: "avoid",
                        }}
                    >
                        <h2
                            style={{
                                marginBottom: "5px",
                                fontSize: "22px",
                                fontWeight: 700,
                                color: "#1f2937",
                            }}
                        >
                            {t("Return Flight")}
                        </h2>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                fontSize: "12px",
                            }}
                        >
                            <div
                                style={{
                                    flexShrink: 0,
                                    paddingTop: "2px",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        height: "35px",
                                        width: "35px",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderRadius: "9999px",
                                        backgroundColor: "#dbeafe",
                                    }}
                                >
                                    <svg
                                        style={{
                                            height: "16px",
                                            width: "16px",
                                            color: "#1e3a8a",
                                        }}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M16 17l-4 4m0 0l-4-4m4 4V3"
                                        ></path>
                                    </svg>
                                </div>
                            </div>
                            <div
                                style={{
                                    marginLeft: "8px",
                                    flex: 1,
                                }}
                            >
                                <h3
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: 500,
                                        color: "#111827",
                                        marginBottom: "4px",
                                    }}
                                >
                                    {bookingData.toCity} ({bookingData.to}) {t("to")} {bookingData.fromCity} ({bookingData.from})
                                </h3>
                                <p
                                    style={{
                                        color: "#1e3a8a",
                                        marginBottom: "4px",
                                        fontSize: "12px",
                                        fontWeight: "bold",
                                    }}
                                >
                                    {formatDate(bookingData.return.date)}
                                </p>
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: "8px",
                                        marginTop: "4px",
                                    }}
                                >
                                    <div>
                                        <p
                                            style={{
                                                fontSize: "10px",
                                                fontWeight: 500,
                                                color: "#6b7280",
                                                marginBottom: "2px",
                                            }}
                                        >
                                            {t("Departure")}
                                        </p>
                                        <p
                                            style={{
                                                fontWeight: 500,
                                                fontSize: "12px",
                                            }}
                                        >
                                            {bookingData.return.departure_time}
                                        </p>
                                    </div>
                                    <div>
                                        <p
                                            style={{
                                                fontSize: "10px",
                                                fontWeight: 500,
                                                color: "#6b7280",
                                                marginBottom: "2px",
                                            }}
                                        >
                                            {t("Arrival")}
                                        </p>
                                        <p
                                            style={{
                                                fontWeight: 500,
                                                fontSize: "12px",
                                            }}
                                        >
                                            {bookingData.return.arrival_time}
                                        </p>
                                    </div>
                                </div>
                                <p
                                    style={{
                                        marginTop: "4px",
                                        fontSize: "10px",
                                        color: "#6b7280",
                                    }}
                                >
                                    {t("Flight number")}: {bookingData.return.noflight}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div
                style={{
                    borderRadius: "5px",
                    border: "1px solid #e5e7eb",
                    padding: "10px",
                    marginBottom: "10px",
                    marginTop: "50px",
                    pageBreakInside: "avoid",
                }}
            >
                <h2
                    style={{
                        marginBottom: "8px",
                        fontSize: "22px",
                        fontWeight: 700,
                        color: "#1f2937",
                    }}
                >
                    {t("Passenger Details")}
                </h2>
                <div
                    style={{
                        overflowX: "auto",
                        fontSize: "10px",
                    }}
                >
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "10px",
                        }}
                    >
                        <thead
                            style={{
                                backgroundColor: "#f9fafb",
                            }}
                        >
                            <tr>
                                <th
                                    style={{
                                        padding: "4px 8px",
                                        textAlign: "left",
                                        fontWeight: 500,
                                        color: "#1e3a8a",
                                        fontSize: "14px",
                                    }}
                                >
                                    {t("Name")}
                                </th>
                                <th
                                    style={{
                                        padding: "4px 8px",
                                        textAlign: "left",
                                        fontWeight: 500,
                                        color: "#1e3a8a",
                                        fontSize: "14px",
                                    }}
                                >
                                    {t("Type")}
                                </th>
                                <th
                                    style={{
                                        padding: "4px 8px",
                                        textAlign: "left",
                                        fontWeight: 500,
                                        color: "#1e3a8a",
                                        fontSize: "14px",
                                    }}
                                >
                                    {t("Email")}
                                </th>
                                <th
                                    style={{
                                        padding: "4px 8px",
                                        textAlign: "left",
                                        fontWeight: 500,
                                        color: "#1e3a8a",
                                        fontSize: "14px",
                                    }}
                                >
                                    {t("Phone")}
                                </th>
                            </tr>
                        </thead>
                        <tbody
                            style={{
                                backgroundColor: "white",
                            }}
                        >
                            {bookingData.passengersData?.adults?.map((passenger: Passenger, index: number) => (
                                <tr
                                    key={`adult-${index}`}
                                    style={{
                                        borderBottom: "1px solid #e5e7eb",
                                    }}
                                >
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "14px",
                                        }}
                                    >
                                        {passenger.firstName} {passenger.lastName}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "14px",
                                        }}
                                    >
                                        {t("Adult")}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "14px",
                                        }}
                                    >
                                        {passenger.email}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "14px",
                                        }}
                                    >
                                        {passenger.phone}
                                    </td>
                                </tr>
                            ))}
                            {bookingData.passengersData?.children?.map((passenger: Passenger, index: number) => (
                                <tr
                                    key={`child-${index}`}
                                    style={{
                                        borderBottom: "1px solid #e5e7eb",
                                    }}
                                >
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "14px",
                                        }}
                                    >
                                        {passenger.firstName} {passenger.lastName}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "14px",
                                        }}
                                    >
                                        {t("Child")}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "14px",
                                        }}
                                    >
                                        {passenger.email || "-"}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "14px",
                                        }}
                                    >
                                        {passenger.phone || "-"}
                                    </td>
                                </tr>
                            ))}
                            {bookingData.passengersData?.infants?.map((passenger: Passenger, index: number) => (
                                <tr
                                    key={`infant-${index}`}
                                    style={{
                                        borderBottom: "1px solid #e5e7eb",
                                    }}
                                >
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "14px",
                                        }}
                                    >
                                        {passenger.firstName} {passenger.lastName}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "14px",
                                        }}
                                    >
                                        {t("Infant")}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "14px",
                                        }}
                                    >
                                        {passenger.email || "-"}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "14px",
                                        }}
                                    >
                                        {passenger.phone || "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div
                style={{
                    borderRadius: "5px",
                    border: "1px solid #e5e7eb",
                    padding: "10px",
                    pageBreakInside: "avoid",
                    marginTop: "35px",
                }}
            >
                <h2
                    style={{
                        marginBottom: "8px",
                        fontSize: "22px",
                        fontWeight: 700,
                        color: "#1f2937",
                    }}
                >
                    {t("Payment Summary")}
                </h2>
                <div
                    style={{
                        marginTop: "8px",
                        fontSize: "12px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "4px",
                        }}
                    >
                        <span
                            style={{
                                color: "#6b7280",
                                fontSize: "14px",
                            }}
                        >
                            {t("Subtotal")}
                        </span>
                        <span
                            style={{
                                fontWeight: 500,
                                fontSize: "14px",
                            }}
                        >
                            ${(bookingData.totalPrice * 0.9).toFixed(2)}
                        </span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "4px",
                        }}
                    >
                        <span
                            style={{
                                color: "#6b7280",
                                fontSize: "14px",
                            }}
                        >
                            {t("Taxes & Fees")}
                        </span>
                        <span
                            style={{
                                fontWeight: 500,
                                fontSize: "14px",
                            }}
                        >
                            ${(bookingData.totalPrice * 0.1).toFixed(2)}
                        </span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            borderTop: "1px solid #e5e7eb",
                            paddingTop: "8px",
                            marginTop: "8px",
                        }}
                    >
                        <span
                            style={{
                                fontWeight: 700,
                                color: "#111827",
                                fontSize: "14px",
                            }}
                        >
                            {t("Total")}
                        </span>
                        <span
                            style={{
                                fontWeight: 700,
                                color: "#111827",
                                fontSize: "14px",
                            }}
                        >
                            ${bookingData.totalPrice.toFixed(2)}
                        </span>
                    </div>
                    <div
                        style={{
                            paddingTop: "4px",
                            textAlign: "right",
                            fontSize: "14px",
                            color: "#6b7280",
                        }}
                    >
                        {paymentMethod === "paypal" ? (
                            <span>
                                <strong>{t("Paid with")}</strong>: PayPal
                            </span>
                        ) : paymentMethod === "paylater" ? (
                            t("Pay Later")
                        ) : (
                            <span>
                                <strong>{t("Paid with")}</strong>: Credit/Debit Card
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div
                style={{
                    marginTop: "10px",
                    textAlign: "center",
                    fontSize: "14px",
                    color: "#1e3a8a",
                    pageBreakInside: "avoid",
                }}
            >
                <p>{t("Thank you for choosing Trogon Airways. We wish you a pleasant journey!")}</p>
            </div>
        </div>
    );
};

const sendTicketByEmail = async (bookingData: BookingData, bookingReference: string, paymentMethod: string) => {
    const apiKey = "api-3E50B3ECEA894D1E8A8FFEF38495B5C4"; // ou process.env.SMTP2GO_API_KEY
    const recipientEmail = bookingData.passengersData.adults[0].email;

    const emailContent = generateEmailContent(bookingData, bookingReference, paymentMethod);

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
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en"; // <-- ici on définit currentLang
    const location = useLocation();
    const navigate = useNavigate();
    const bookingData = location.state?.bookingData as BookingData;
    const paymentMethod = location.state?.paymentMethod;
    const [currentStep] = useState(3);
    const { t, i18n } = useTranslation();

    useEffect(() => {
        if (!bookingData) {
            navigate(`/${currentLang}/flights`);
        }
    }, [bookingData, navigate]);

    useEffect(() => {
        if (bookingData?.bookingReference) {
            sendTicketByEmail(bookingData, bookingData.bookingReference, paymentMethod);
        }
    }, [bookingData]);

    if (!bookingData) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <p className="text-red-900">{t("No booking data found")}</p>
                    <button
                        onClick={() => navigate(`/${currentLang}/flights`)}
                        className="mt-4 rounded bg-blue-900 px-4 py-2 text-white"
                    >
                        {t("Return to Flights")}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
        {/* SessionTimeout */}
              <SessionTimeout />
            <HeroSection />
            <div
                className="z-1 relative flex h-[300px] w-full items-center justify-center bg-cover bg-center text-center text-white"
                style={{ backgroundImage: "url(/plane-bg.jpg)" }}
            >
                <div className="absolute inset-0 bg-black bg-opacity-30"></div>

                <div className="px-4">
                    <h1 className="mb-6 text-4xl font-bold md:text-5xl">{t("Booking details")}</h1>
                </div>
            </div>
            <div className="relative z-10 mx-auto mb-6 mt-[-100px] w-full max-w-7xl rounded bg-white px-4 py-5 shadow-lg">
                <style>{printStyles}</style>

                <Stepper currentStep={currentStep} />

                <div className="w-full">
                    <div className="overflow-hidden">
                        <PrintableContent
                            bookingData={bookingData}
                            paymentMethod={paymentMethod}
                        />
                        <div className="no-print border-t border-gray-200 bg-gray-50 px-6 py-5">
                            <div className="flex justify-between">
                                <button
                                    onClick={() => navigate(`/${currentLang}/`)}
                                    className="rounded-md border border-gray-300 bg-red-900 px-4 py-3 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 hover:bg-red-700"
                                >
                                    {t("Book Another Flight")}
                                </button>
                                {/* <button
                                onClick={() => handlePrint(bookingData)}
                                className="ml-3 inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
                            >
                                Print Confirmation
                            </button> */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
