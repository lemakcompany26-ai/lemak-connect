import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

const FALLBACK_PRODUCTS = [
  {
    id: "rentals",
    name: "Rentals",
    description: "Chairs, tables, canopies and event equipment.",
    options: [
      { id: "chairs", name: "Plastic Chairs", unitPrice: 500 },
      { id: "tables", name: "Tables", unitPrice: 1500 },
      { id: "canopies", name: "Canopies", unitPrice: 15000 },
      { id: "event_equipment", name: "Event Equipment", unitPrice: 25000 },
    ],
  },
  {
    id: "event-planning",
    name: "Event Planning",
    description: "Professional event planning and decoration.",
    options: [
      { id: "wedding", name: "Wedding Planning", unitPrice: 150000 },
      { id: "birthday", name: "Birthday Planning", unitPrice: 75000 },
      { id: "house-warming", name: "House Warming", unitPrice: 60000 },
      { id: "corporate", name: "Corporate Event", unitPrice: 150000 },
      { id: "full-planning", name: "Full Event Planning", unitPrice: 200000 },
      { id: "decoration", name: "Event Decoration", unitPrice: 100000 },
    ],
  },
  {
    id: "water-production",
    name: "Water Production",
    description: "Water production and custom branding.",
    options: [
      { id: "sachet", name: "Sachet Water", unitPrice: 25000 },
      { id: "bottled", name: "Bottled Water", unitPrice: 50000 },
      { id: "custom-branded", name: "Custom Branded Water", unitPrice: 100000 },
      { id: "bulk", name: "Bulk Water Production", unitPrice: 75000 },
    ],
  },
  {
    id: "electricity",
    name: "Electricity",
    description: "Electrical installation, wiring and maintenance.",
    options: [
      { id: "installation", name: "Electrical Installation", unitPrice: 75000 },
      { id: "wiring", name: "Electrical Wiring", unitPrice: 100000 },
      { id: "maintenance", name: "Electrical Maintenance", unitPrice: 50000 },
      {
        id: "generator",
        name: "Generator / Electrical Engineering",
        unitPrice: 100000,
      },
    ],
  },
  {
    id: "website-app-development",
    name: "Website & App Development",
    description: "Professional website and application development.",
    options: [
      {
        id: "business-website",
        name: "Business Website",
        unitPrice: 150000,
      },
      { id: "ecommerce", name: "E-commerce Website", unitPrice: 250000 },
      { id: "mobile-app", name: "Mobile App", unitPrice: 400000 },
      { id: "web-app", name: "Web Application", unitPrice: 350000 },
      { id: "custom-software", name: "Custom Software", unitPrice: 500000 },
    ],
  },
];

function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG")}`;
}

export default function LemakExpertProduct() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [categoryId, setCategoryId] = useState("");
  const [optionId, setOptionId] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [bookingDate, setBookingDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      try {
        setLoadingProducts(true);
        setError("");

        const result = await base44.functions.invoke("expertProducts", {});

        const loaded = result?.data?.products;

        if (mounted && Array.isArray(loaded) && loaded.length > 0) {
          setProducts(loaded);
        } else if (mounted) {
          setProducts(FALLBACK_PRODUCTS);
        }
      } catch (err) {
        console.error("Failed to load expert products:", err);

        if (mounted) {
          setProducts(FALLBACK_PRODUCTS);
          setError(
            "Live service prices could not be loaded. Please try again."
          );
        }
      } finally {
        if (mounted) {
          setLoadingProducts(false);
        }
      }
    }

    loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedCategory = useMemo(
    () => products.find((item) => item.id === categoryId) || null,
    [products, categoryId]
  );

  const selectedOption = useMemo(
    () =>
      selectedCategory?.options?.find((item) => item.id === optionId) || null,
    [selectedCategory, optionId]
  );

  const total = useMemo(() => {
    if (!selectedOption) return 0;
    return Number(selectedOption.unitPrice || 0) * Number(quantity || 1);
  }, [selectedOption, quantity]);

  function selectCategory(id) {
    setCategoryId(id);
    setOptionId("");
    setError("");
    setSuccessMessage("");
  }

  function selectOption(id) {
    setOptionId(id);
    setError("");
    setSuccessMessage("");
  }

  function increaseQuantity() {
    setQuantity((current) => Math.min(10000, current + 1));
  }

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  async function handleCheckout() {
    setError("");
    setSuccessMessage("");

    if (!categoryId) {
      setError("Please select a service category.");
      return;
    }

    if (!optionId) {
      setError("Please select the exact service you need.");
      return;
    }

    if (!bookingDate) {
      setError("Please select your service date.");
      return;
    }

    if (!location.trim()) {
      setError("Please enter the service location.");
      return;
    }

    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      setError("Please enter a valid quantity.");
      return;
    }

    try {
      setLoadingCheckout(true);

      const result = await base44.functions.invoke(
        "expertBookingCheckout",
        {
          categoryId,
          optionId,
          quantity: Number(quantity),
          bookingDate,
          location: location.trim(),
          notes: notes.trim(),
          callbackUrl: window.location.href,
        }
      );

      const data = result?.data;

      if (!data?.checkoutUrl) {
        throw new Error(
          data?.error || "Unable to start payment."
        );
      }

      /*
       * KoraPay checkout is opened only after the backend
       * has calculated and created the booking.
       */
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error("Expert Product checkout error:", err);

      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Unable to start payment. Please try again."
      );
    } finally {
      setLoadingCheckout(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>

          <div className="text-center">
            <div className="text-lg font-black tracking-wide text-blue-700">
              LEMAK EXPERT PRODUCT
            </div>
            <div className="text-[11px] text-slate-500">
              Developed by MOSCO under Lemak Company
            </div>
          </div>

          <ShoppingBag className="h-5 w-5 text-blue-700" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        {/* Hero */}
        <section className="mb-8 rounded-3xl bg-gradient-to-br from-blue-700 to-blue-950 p-6 text-white shadow-xl sm:p-10">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <ShieldCheck className="h-4 w-4" />
              Secure KoraPay Checkout
            </div>

            <h1 className="text-3xl font-black sm:text-5xl">
              Professional services,
              <br />
              made simple.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
              Book rentals, event planning, water production, electricity
              services, website development and custom applications through
              Lemak Expert Product.
            </p>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
            {successMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Main selection */}
          <div className="space-y-6">
            <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5">
                <h2 className="text-xl font-bold">1. Choose a service</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select the category that matches what you need.
                </p>
              </div>

              {loadingProducts ? (
                <div className="flex items-center justify-center py-14">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-700" />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {products.map((product) => {
                    const active = categoryId === product.id;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => selectCategory(product.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                            : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-bold">{product.name}</div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                              {product.description}
                            </div>
                          </div>

                          <ChevronRight
                            className={`h-5 w-5 shrink-0 ${
                              active ? "text-blue-700" : "text-slate-400"
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {selectedCategory && (
              <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5">
                  <h2 className="text-xl font-bold">2. Choose the service</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select exactly what you want us to provide.
                  </p>
                </div>

                <div className="space-y-3">
                  {selectedCategory.options?.map((option) => {
                    const active = optionId === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => selectOption(option.id)}
                        className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                            : "border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{option.name}</div>
                          <div className="mt-1 text-sm text-slate-500">
                            From {formatNaira(option.unitPrice)}
                          </div>
                        </div>

                        {active && (
                          <CheckCircle2 className="h-6 w-6 text-blue-700" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {selectedOption && (
              <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5">
                  <h2 className="text-xl font-bold">3. Booking details</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Give us the details required to process your service.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Quantity
                    </label>

                    <div className="flex w-fit items-center overflow-hidden rounded-xl border">
                      <button
                        type="button"
                        onClick={decreaseQuantity}
                        className="p-3 hover:bg-slate-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <div className="min-w-16 border-x px-5 py-3 text-center font-bold">
                        {quantity}
                      </div>

                      <button
                        type="button"
                        onClick={increaseQuantity}
                        className="p-3 hover:bg-slate-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="booking-date"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Service date
                    </label>

                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="booking-date"
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full rounded-xl border bg-white py-3 pl-11 pr-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="service-location"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Service location
                    </label>

                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />

                      <textarea
                        id="service-location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        rows={3}
                        placeholder="Enter the address/location where the service is needed"
                        className="w-full resize-none rounded-xl border bg-white py-3 pl-11 pr-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="booking-notes"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Additional details{" "}
                      <span className="font-normal text-slate-400">
                        (optional)
                      </span>
                    </label>

                    <textarea
                      id="booking-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      placeholder="Tell us anything important about your booking..."
                      className="w-full resize-none rounded-xl border bg-white p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Order summary */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-bold">Booking summary</h2>

              <div className="my-5 border-t" />

              {!selectedOption ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  Select a service to see your booking summary.
                </div>
              ) : (
                <>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="text-slate-500">Category</div>
                      <div className="mt-1 font-semibold">
                        {selectedCategory.name}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500">Service</div>
                      <div className="mt-1 font-semibold">
                        {selectedOption.name}
                      </div>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Unit price</span>
                      <span className="font-semibold">
                        {formatNaira(selectedOption.unitPrice)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Quantity</span>
                      <span className="font-semibold">{quantity}</span>
                    </div>
                  </div>

                  <div className="my-5 border-t" />

                  <div className="flex items-end justify-between gap-4">
                    <span className="font-semibold">Total</span>

                    <span className="text-2xl font-black text-blue-700">
                      {formatNaira(total)}
                    </span>
                  </div>

                  <Button
                    type="button"
                    onClick={handleCheckout}
                    disabled={loadingCheckout}
                    className="mt-6 h-12 w-full rounded-xl bg-blue-700 font-bold hover:bg-blue-800"
                  >
                    {loadingCheckout ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Starting checkout...
                      </>
                    ) : (
                      "Pay with KoraPay"
                    )}
                  </Button>
                </>
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}