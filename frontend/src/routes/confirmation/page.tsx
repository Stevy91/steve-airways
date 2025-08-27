import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

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

    return `
    <!DOCTYPE html>
    <html>
    <head>
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
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Flight Booking Confirmation</h1>
          <p>Booking Reference: <strong>${bookingReference}</strong></p>
        </div>
        
        <h2>Flight Details</h2>
        
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
        `
                : ""
        }
        
        <h2>Passenger Information</h2>
        <table class="passenger-table">
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Email</th>
          </tr>
          ${bookingData.passengersData?.adults
              ?.map(
                  (passenger: Passenger) => `
            <tr>
              <td>${passenger.firstName} ${passenger.lastName}</td>
              <td>Adult</td>
              <td>${passenger.email}</td>
            </tr>
          `,
              )
              .join("")}
          ${bookingData.passengersData?.children
              ?.map(
                  (passenger: Passenger) => `
            <tr>
              <td>${passenger.firstName} ${passenger.lastName}</td>
              <td>Child</td>
              <td>${passenger.email || "-"}</td>
            </tr>
          `,
              )
              .join("")}
          ${bookingData.passengersData?.infants
              ?.map(
                  (passenger: Passenger) => `
            <tr>
              <td>${passenger.firstName} ${passenger.lastName}</td>
              <td>Infant</td>
              <td>${passenger.email || "-"}</td>
            </tr>
          `,
              )
              .join("")}
        </table>
        
        <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
          <h3>Payment Summary</h3>
          <p>Subtotal: $${(bookingData.totalPrice * 0.9).toFixed(2)}</p>
          <p>Taxes & Fees: $${(bookingData.totalPrice * 0.1).toFixed(2)}</p>
          <p><strong>Total Paid: $${bookingData.totalPrice.toFixed(2)}</strong></p>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing our airline. We wish you a pleasant journey!</p>
          <p>For any questions, please contact our customer service.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const PrintableContent = ({ bookingData, paymentMethod }: { bookingData: BookingData; paymentMethod: string }) => {
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
                    fontSize: "18px",
                    fontWeight: 700,
                }}
            >
                Trogon Airways - Booking Confirmation
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
                            height: "20px",
                            width: "20px",
                            color: "#16a34a",
                        }}
                    />
                </div>
                <h2
                    style={{
                        fontSize: "14px",
                        fontWeight: 700,
                    }}
                >
                    Flight Type: {bookingData.tabType === "helicopter" ? "Helicopter" : "Plane"}
                </h2>
                <h2
                    style={{
                        fontSize: "14px",
                        fontWeight: 700,
                    }}
                >
                    Booking Reference: {bookingData.bookingReference}
                </h2>
                <p
                    style={{
                        color: "#4b5563",
                        fontSize: "12px",
                    }}
                >
                    Payment Method: {paymentMethod === "paypal" ? "PayPal" : "Credit/Debit Card"}
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
                        border: "1px solid #e5e7eb",
                        padding: "10px",
                        pageBreakInside: "avoid",
                    }}
                >
                    <h2
                        style={{
                            marginBottom: "5px",
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "#1f2937",
                        }}
                    >
                        Outbound Flight
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
                                    height: "20px",
                                    width: "20px",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: "9999px",
                                    backgroundColor: "#dbeafe",
                                }}
                            >
                                <svg
                                    style={{
                                        height: "12px",
                                        width: "12px",
                                        color: "#2563eb",
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
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    color: "#111827",
                                    marginBottom: "4px",
                                }}
                            >
                                {bookingData.fromCity} ({bookingData.from}) to {bookingData.toCity} ({bookingData.to})
                            </h3>
                            <p
                                style={{
                                    color: "#6b7280",
                                    marginBottom: "4px",
                                }}
                            >
                                {new Date(bookingData.outbound.date).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                })}
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
                                        Departure
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
                                        Arrival
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
                                Flight number: {bookingData.outbound.noflight}
                            </p>
                        </div>
                    </div>
                </div>

                {bookingData.return && (
                    <div
                        style={{
                            borderRadius: "5px",
                            border: "1px solid #e5e7eb",
                            padding: "10px",
                            pageBreakInside: "avoid",
                        }}
                    >
                        <h2
                            style={{
                                marginBottom: "5px",
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "#1f2937",
                            }}
                        >
                            Return Flight
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
                                        height: "20px",
                                        width: "20px",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderRadius: "9999px",
                                        backgroundColor: "#dbeafe",
                                    }}
                                >
                                    <svg
                                        style={{
                                            height: "12px",
                                            width: "12px",
                                            color: "#2563eb",
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
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color: "#111827",
                                        marginBottom: "4px",
                                    }}
                                >
                                    {bookingData.toCity} ({bookingData.to}) to {bookingData.fromCity} ({bookingData.from})
                                </h3>
                                <p
                                    style={{
                                        color: "#6b7280",
                                        marginBottom: "4px",
                                    }}
                                >
                                    {new Date(bookingData.return.date).toLocaleDateString("en-US", {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                    })}
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
                                            Departure
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
                                            Arrival
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
                                    Flight number: {bookingData.return.noflight}
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
                    pageBreakInside: "avoid",
                }}
            >
                <h2
                    style={{
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#1f2937",
                    }}
                >
                    Passenger Details
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
                                        color: "#6b7280",
                                        fontSize: "10px",
                                    }}
                                >
                                    Name
                                </th>
                                <th
                                    style={{
                                        padding: "4px 8px",
                                        textAlign: "left",
                                        fontWeight: 500,
                                        color: "#6b7280",
                                        fontSize: "10px",
                                    }}
                                >
                                    Type
                                </th>
                                <th
                                    style={{
                                        padding: "4px 8px",
                                        textAlign: "left",
                                        fontWeight: 500,
                                        color: "#6b7280",
                                        fontSize: "10px",
                                    }}
                                >
                                    Email
                                </th>
                                <th
                                    style={{
                                        padding: "4px 8px",
                                        textAlign: "left",
                                        fontWeight: 500,
                                        color: "#6b7280",
                                        fontSize: "10px",
                                    }}
                                >
                                    Phone
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
                                            fontSize: "10px",
                                        }}
                                    >
                                        {passenger.firstName} {passenger.lastName}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "10px",
                                        }}
                                    >
                                        Adult
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "10px",
                                        }}
                                    >
                                        {passenger.email}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "10px",
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
                                            fontSize: "10px",
                                        }}
                                    >
                                        {passenger.firstName} {passenger.lastName}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "10px",
                                        }}
                                    >
                                        Child
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "10px",
                                        }}
                                    >
                                        {passenger.email || "-"}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "10px",
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
                                            fontSize: "10px",
                                        }}
                                    >
                                        {passenger.firstName} {passenger.lastName}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "10px",
                                        }}
                                    >
                                        Infant
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "10px",
                                        }}
                                    >
                                        {passenger.email || "-"}
                                    </td>
                                    <td
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "10px",
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
                }}
            >
                <h2
                    style={{
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#1f2937",
                    }}
                >
                    Payment Summary
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
                                fontSize: "12px",
                            }}
                        >
                            Subtotal
                        </span>
                        <span
                            style={{
                                fontWeight: 500,
                                fontSize: "12px",
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
                                fontSize: "12px",
                            }}
                        >
                            Taxes & Fees
                        </span>
                        <span
                            style={{
                                fontWeight: 500,
                                fontSize: "12px",
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
                                fontSize: "12px",
                            }}
                        >
                            Total
                        </span>
                        <span
                            style={{
                                fontWeight: 700,
                                color: "#111827",
                                fontSize: "12px",
                            }}
                        >
                            ${bookingData.totalPrice.toFixed(2)}
                        </span>
                    </div>
                    <div
                        style={{
                            paddingTop: "4px",
                            textAlign: "right",
                            fontSize: "10px",
                            color: "#6b7280",
                        }}
                    >
                        Paid with {paymentMethod === "paypal" ? "PayPal" : "Credit Card"}
                    </div>
                </div>
            </div>

            <div
                style={{
                    marginTop: "10px",
                    textAlign: "center",
                    fontSize: "10px",
                    color: "#6b7280",
                    pageBreakInside: "avoid",
                }}
            >
                <p>Thank you for choosing Trogon Airways. We wish you a pleasant journey!</p>
            </div>
        </div>
    );
};

const handlePrint = (bookingData: BookingData) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Booking Confirmation - ${bookingData.bookingReference}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 0;
                        padding: 10px;
                        font-size: 12px;
                        color: #333;
                    }
                    .print-section {
                        width: 100%;
                        max-width: 100%;
                        margin: 0 auto;
                        padding: 10px;
                        box-sizing: border-box;
                    }
                    h1 { 
                        font-size: 18px; 
                        margin-bottom: 10px; 
                        text-align: center;
                        font-weight: bold;
                    }
                    h2 {
                        font-size: 14px;
                        margin: 8px 0;
                        font-weight: bold;
                    }
                    .flight-card {
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        padding: 10px;
                        margin-bottom: 10px;
                        page-break-inside: avoid;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 10px;
                        margin: 8px 0;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 4px 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #f5f5f5;
                        font-weight: bold;
                    }
                    .payment-summary {
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        padding: 10px;
                        margin-top: 10px;
                        page-break-inside: avoid;
                    }
                    .total-row {
                        border-top: 1px solid #333;
                        padding-top: 8px;
                        font-weight: bold;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 10px;
                        font-size: 10px;
                        color: #666;
                    }
                    @page {
                        size: auto;
                        margin: 10mm;
                    }
                </style>
            </head>
            <body>
                <div class="print-section">
                    ${document.querySelector(".print-section")?.outerHTML || ""}
                </div>
                <script>
                    setTimeout(function() {
                        window.print();
                        window.close();
                    }, 200);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
};

const sendTicketByEmail = async (bookingData: BookingData, bookingReference: string): Promise<void> => {
    try {
        const emailContent = generateEmailContent(bookingData, bookingReference);
        const recipientEmail = bookingData.passengersData.adults[0].email;
        if (!recipientEmail) {
            throw new Error("Recipient email not found");
        }

        const response = await fetch("https://steve-airways-production.up.railway.app/api/send-ticket", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                to: recipientEmail,
                subject: `Your Flight Booking Confirmation - ${bookingReference}`,
                html: emailContent,
                bookingReference: bookingReference,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to send email: ${errorData.error || JSON.stringify(errorData)}`);
        }

        console.log("Email sent successfully");
    } catch (error) {
        console.error("Error sending email:", error);
    }
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
                    <PrintableContent
                        bookingData={bookingData}
                        paymentMethod={paymentMethod}
                    />

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
