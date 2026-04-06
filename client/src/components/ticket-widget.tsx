import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Calendar } from "lucide-react";

interface TicketType {
  name: string;
  price_ghs: number;
  price_gbp?: number;
  capacity?: number;
}

interface TicketWidgetProps {
  ticketTypes: TicketType[];
  courseTitle: string;
  courseId: string;
  enrolledCount?: number;
  totalCapacity?: number;
  onRegister: (selections: Record<string, number>) => void;
}

export default function TicketWidget({
  ticketTypes,
  courseTitle,
  courseId,
  enrolledCount = 0,
  totalCapacity,
  onRegister,
}: TicketWidgetProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const defaultTickets: TicketType[] = ticketTypes.length > 0 ? ticketTypes : [
    { name: "Associate", price_ghs: 5500 },
    { name: "Fellow", price_ghs: 8500 },
  ];

  const updateQty = (name: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [name]: Math.max(0, (prev[name] || 0) + delta),
    }));
  };

  const totalQty = Object.values(quantities).reduce((s, q) => s + q, 0);
  const totalAmount = defaultTickets.reduce(
    (sum, t) => sum + (quantities[t.name] || 0) * t.price_ghs,
    0,
  );

  const spotsRemaining = totalCapacity ? totalCapacity - enrolledCount : null;
  const isSoldOut = spotsRemaining !== null && spotsRemaining <= 0;

  const addToCalendar = (type: string) => {
    const url =
      type === "google"
        ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(courseTitle)}`
        : type === "yahoo"
          ? `https://calendar.yahoo.com/?v=60&title=${encodeURIComponent(courseTitle)}`
          : type === "outlook"
            ? `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(courseTitle)}`
            : "#";
    window.open(url, "_blank");
  };

  return (
    <Card className="border-primary/20 shadow-lg sticky top-24">
      <CardContent className="p-6 space-y-5">
        <h3 className="text-lg font-bold text-foreground">Tickets</h3>

        {spotsRemaining !== null && spotsRemaining > 0 && spotsRemaining <= 10 && (
          <p className="text-sm font-semibold text-amber-600">
            Only {spotsRemaining} spots left!
          </p>
        )}
        {spotsRemaining !== null && spotsRemaining > 10 && (
          <p className="text-sm text-muted-foreground">
            {spotsRemaining} spots remaining
          </p>
        )}

        {isSoldOut ? (
          <div className="text-center py-4">
            <p className="text-destructive font-bold mb-2">Sold Out</p>
            <p className="text-sm text-muted-foreground mb-3">Join the waitlist to be notified</p>
            <Button variant="outline" className="w-full" onClick={() => onRegister({})}>
              Join Waitlist
            </Button>
          </div>
        ) : (
          <>
            {defaultTickets.map((ticket) => (
              <div key={ticket.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-foreground">{ticket.name}</p>
                    <p className="text-sm text-primary font-bold">
                      GHS {ticket.price_ghs.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQty(ticket.name, -1)}
                      disabled={(quantities[ticket.name] || 0) === 0}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">
                      {quantities[ticket.name] || 0}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQty(ticket.name, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Subtotal: ₵{((quantities[ticket.name] || 0) * ticket.price_ghs).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}

            <div className="border-t pt-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Quantity: {totalQty}
              </span>
              <span className="text-lg font-bold text-foreground">
                Total: ₵{totalAmount.toLocaleString()}.00
              </span>
            </div>

            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
              disabled={totalQty === 0}
              onClick={() => onRegister(quantities)}
            >
              Register & Pay →
            </Button>
          </>
        )}

        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Add to Calendar:
          </p>
          <div className="flex flex-wrap gap-2">
            {["Google", "Yahoo", "Apple", "Outlook"].map((cal) => (
              <Button
                key={cal}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => addToCalendar(cal.toLowerCase())}
              >
                {cal}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
