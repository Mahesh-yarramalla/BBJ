"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, MapPin, PackageCheck, ShoppingBag } from "lucide-react";

type CartItem = { variantId: string; quantity: number };
type Slot = { id: string; label: string; startTime: string; endTime: string; weekdays: number[]; cutOffTime: string; capacity: number };
type Pickup = { id: string; name: string; addressLine1: string | null; addressLine2: string | null; city: string; state: string; postcode: string | null; instructions: string | null };
type Options = { postcode: string; deliveryEnabled: boolean; routingConfigured: boolean; zones: Array<{ id: string; name: string }>; pickupLocations: Pickup[]; deliverySlots: Slot[]; pickupSlots: Slot[]; ratePaisePerKm: number };
const CART_KEY = "bake-and-bloom-cart";

function readCart(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is CartItem => !!x && typeof x.variantId === "string" && Number.isInteger(x.quantity) && x.quantity > 0 && x.quantity <= 99);
  } catch { return []; }
}

export default function CheckoutPage() {
  const [options, setOptions] = useState<Options | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [fulfillmentType, setFulfillmentType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [deliveryAddress1, setDeliveryAddress1] = useState("");
  const [deliveryAddress2, setDeliveryAddress2] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("Coimbatore");
  const [deliveryState, setDeliveryState] = useState("Tamil Nadu");
  const [deliveryPostcode, setDeliveryPostcode] = useState("641004");
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [fulfillmentSlotId, setFulfillmentSlotId] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [availableDates, setAvailableDates] = useState<
  Array<{
    date: string;
    label: string;
    slots: Array<{
      id: string;
      label: string;
      startTime: string;
      endTime: string;
      scheduledFor: string;
      remainingCapacity: number;
    }>;
  }>
  >([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  useEffect(() => {
    setCart(readCart());
    fetch("/api/checkout", { cache: "no-store" }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Unable to load checkout options.");
      setOptions(data);
    }).catch((e: unknown) => setMessage(e instanceof Error ? e.message : "Unable to load checkout options."));
  }, []);

  useEffect(() => { setFulfillmentSlotId(""); }, [fulfillmentType]);
  useEffect(() => {
    if (!cart.length) {
      setAvailableDates([]);
      setSelectedDate("");
      setFulfillmentSlotId("");
      setScheduledFor("");
      setAvailabilityLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadAvailability() {
      setAvailabilityLoading(true);
      setAvailableDates([]);
      setSelectedDate("");
      setFulfillmentSlotId("");
      setScheduledFor("");

      try {
        const response = await fetch("/api/checkout/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({
            fulfillmentType,
            items: cart,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load available dates.");
        }

        const dates = data.dates as typeof availableDates;
        setAvailableDates(dates);

        if (dates.length > 0 && dates[0].slots.length > 0) {
          const firstDate = dates[0];
          const firstSlot = firstDate.slots[0];

          setSelectedDate(firstDate.date);
          setFulfillmentSlotId(firstSlot.id);
          setScheduledFor(firstSlot.scheduledFor);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load available dates."
        );
      } finally {
        if (!controller.signal.aborted) {
          setAvailabilityLoading(false);
        }
      }
    }

    void loadAvailability();

    return () => controller.abort();
  }, [cart, fulfillmentType]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (!cart.length) { setMessage("Your bag is empty. Add products before checkout."); return; }
    if (!fulfillmentSlotId) { setMessage("No active fulfillment slot is selected. Please contact the bakery while slots are being configured."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ customerName, customerPhone, customerEmail, customerNotes, fulfillmentType, fulfillmentSlotId, scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : "", items: cart, deliveryAddress1, deliveryAddress2, deliveryCity, deliveryState, deliveryPostcode, pickupLocationId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to place order.");
      localStorage.removeItem(CART_KEY);
      window.location.assign(`/order-confirmation/${encodeURIComponent(data.orderNumber)}`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to place order."); }
    finally { setBusy(false); }
  }

  return (
    <section className="checkout-section">
      <div className="container">
        <Link href="/cart" className="back-to-shop">
          <ArrowLeft size={16} /> Back to your bag
        </Link>

        <div className="checkout-heading">
          <div className="eyebrow">Almost something lovely</div>
          <h1 className="section-heading">Checkout</h1>
          <p className="section-subtitle">Tell us how to prepare your order.</p>
        </div>

        {message && (
          <div className="checkout-alert" role="alert">
            {message}
          </div>
        )}

        {!options ? (
          <div className="checkout-panel">Loading delivery and pickup options…</div>
        ) : (
          <form className="checkout-layout" onSubmit={submit}>
            <div className="checkout-main">
              <section className="checkout-panel">
                <h2>Contact details</h2>
                <div className="checkout-fields">
                  <label>
                    Full name
                    <input required minLength={2} maxLength={120} value={customerName} onChange={(e) => setCustomerName(e.target.value)} autoComplete="name" />
                  </label>
                  <label>
                    Phone number
                    <input required type="tel" minLength={8} maxLength={20} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} autoComplete="tel" />
                  </label>
                  <label className="checkout-full">
                    Email (optional)
                    <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} autoComplete="email" />
                  </label>
                </div>
              </section>

              <section className="checkout-panel">
                <h2>Delivery or pickup</h2>
                <div className="checkout-choice-row">
                  <button type="button" className={`checkout-choice ${fulfillmentType === "DELIVERY" ? "is-selected" : ""}`} onClick={() => setFulfillmentType("DELIVERY")}>
                    <MapPin size={18} />
                    <span>
                      <strong>Delivery</strong>
                      <small>PIN code {options.postcode}</small>
                    </span>
                  </button>
                  <button type="button" className={`checkout-choice ${fulfillmentType === "PICKUP" ? "is-selected" : ""}`} onClick={() => setFulfillmentType("PICKUP")}>
                    <PackageCheck size={18} />
                    <span>
                      <strong>Bakery pickup</strong>
                      <small>Collect your order</small>
                    </span>
                  </button>
                </div>

                {fulfillmentType === "DELIVERY" ? (
                  <>
                    <div className="checkout-fields checkout-address-fields">
                      <label className="checkout-full">
                        Address line 1
                        <input required value={deliveryAddress1} onChange={(e) => setDeliveryAddress1(e.target.value)} autoComplete="address-line1" placeholder="House / apartment and street" />
                      </label>
                      <label className="checkout-full">
                        Address line 2 (optional)
                        <input value={deliveryAddress2} onChange={(e) => setDeliveryAddress2(e.target.value)} autoComplete="address-line2" placeholder="Landmark, block, floor" />
                      </label>
                      <label>
                        City
                        <input required value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} />
                      </label>
                      <label>
                        State
                        <input required value={deliveryState} onChange={(e) => setDeliveryState(e.target.value)} />
                      </label>
                      <label>
                        PIN code
                        <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={deliveryPostcode} onChange={(e) => setDeliveryPostcode(e.target.value)} />
                      </label>
                    </div>
                    <p className="checkout-hint">Delivery is limited to PIN code 641004. The delivery fee is ₹30 per started kilometre of driving distance.</p>
                    {!options.deliveryEnabled && <p className="checkout-warning">Delivery is not ready yet: the postcode zone must be active and driving-distance pricing must be configured.</p>}
                  </>
                ) : (
                  <>
                    {options.pickupLocations.length ? (
                      <label className="checkout-select-label">
                        Pickup location
                        <select required value={pickupLocationId} onChange={(e) => setPickupLocationId(e.target.value)}>
                          <option value="">Choose a pickup location</option>
                          {options.pickupLocations.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {p.city}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <p className="checkout-warning">No active pickup location is configured yet. Pickup will be available once the bakery location is added and activated.</p>
                    )}
                  </>
                )}
              </section>

              <section className="checkout-panel">
                <h2>
                  <CalendarClock size={20} /> Fulfillment time
                </h2>

                {availabilityLoading ? (
                  <p className="checkout-hint">Checking available dates and time slots…</p>
                ) : availableDates.length > 0 ? (
                  <>
                    <label className="checkout-select-label">
                      Available date
                      <select
                        required
                        value={selectedDate}
                        onChange={(e) => {
                          const date = e.target.value;
                          const day = availableDates.find((d) => d.date === date);
                          const firstSlot = day?.slots[0];

                          setSelectedDate(date);
                          setFulfillmentSlotId(firstSlot?.id ?? "");
                          setScheduledFor(firstSlot?.scheduledFor ?? "");
                        }}
                      >
                        {availableDates.map((day) => (
                          <option key={day.date} value={day.date}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="checkout-select-label">
                      Available time slot
                      <select
                        required
                        value={fulfillmentSlotId}
                        onChange={(e) => {
                          const slot = availableDates
                            .find((day) => day.date === selectedDate)
                            ?.slots.find((s) => s.id === e.target.value);

                          setFulfillmentSlotId(slot?.id ?? "");
                          setScheduledFor(slot?.scheduledFor ?? "");
                        }}
                      >
                        {(availableDates.find((day) => day.date === selectedDate)?.slots ?? []).map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {slot.label} ({slot.startTime}–{slot.endTime}) — {slot.remainingCapacity} booking(s) left
                          </option>
                        ))}
                      </select>
                    </label>

                    <p className="checkout-hint">Your order will be scheduled for the selected slot. Availability is checked again when you place your order.</p>
                  </>
                ) : (
                  <p className="checkout-warning">
                    {fulfillmentType === "DELIVERY" && !options?.deliveryEnabled
                      ? "Delivery is not currently configured."
                      : "No available dates or time slots were found. Try another fulfillment option or contact the bakery."}
                  </p>
                )}
              </section>

              <section className="checkout-panel">
                <h2>Order notes</h2>
                <label className="checkout-select-label">
                  Anything we should know? (optional)
                  <textarea rows={3} maxLength={1000} value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} placeholder="Allergies, writing on a cake, or delivery instructions" />
                </label>
              </section>
            </div>

            <aside className="checkout-summary">
              <h2>
                <ShoppingBag size={19} /> Order summary
              </h2>
              <p>{cart.reduce((sum, item) => sum + item.quantity, 0)} item(s) in your bag</p>
              <div className="checkout-summary-note">Product prices and stock will be revalidated against the database when you place the order. Delivery is not charged until the server calculates the driving route.</div>
              <button
                className="button button-primary checkout-submit"
                type="submit"
                disabled={busy || !cart.length || !options || !fulfillmentSlotId || (fulfillmentType === "DELIVERY" ? !options.deliveryEnabled : !options.pickupLocations.length)}
              >
                {busy ? "Validating order…" : "Place order"}
              </button>
              <p className="checkout-legal">No online payment is collected in this phase. An order can only be placed when fulfillment settings are active.</p>
            </aside>
          </form>
        )}
      </div>
    </section>
  );
}
