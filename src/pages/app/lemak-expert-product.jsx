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
  BriefcaseBusiness,
  RefreshCw,
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
      {
        id: "event_equipment",
        name: "Event Equipment",
        unitPrice: 25000,
      },
    ],
  },
  {
    id: "event-planning",
    name: "Event Planning",
    description: "Professional event planning and decoration.",
    options: [
      {
        id: "wedding",
        name: "Wedding Planning",
        unitPrice: 150000,
      },
      {
        id: "birthday",
        name: "Birthday Planning",
        unitPrice: 75000,
      },
      {
        id: "house-warming",
        name: "House Warming",
        unitPrice: 60000,
      },
      {
        id: "corporate",
        name: "Corporate Event",
        unitPrice: 150000,
      },
      {
        id: "full-planning",
        name: "Full Event Planning",
        unitPrice: 200000,
      },
      {
        id: "decoration",
        name: "Event Decoration",
        unitPrice: 100000,
      },
    ],
  },
  {
    id: "water-production",
    name: "Water Production",
    description: "Water production and custom branding.",
    options: [
      {
        id: "sachet",
        name: "Sachet Water",
        unitPrice: 25000,
      },
      {
        id: "bottled",
        name: "Bottled Water",
        unitPrice: 50000,
      },
      {
        id: "custom-branded",
        name: "Custom Branded Water",
        unitPrice: 100000,
      },
      {
        id: "bulk",
        name: "Bulk Water Production",
        unitPrice: 75000,
      },
    ],
  },
  {
    id: "electricity",
    name: "Electricity",
    description: "Electrical installation, wiring and maintenance.",
    options: [
      {
        id: "installation",
        name: "Electrical Installation",
        unitPrice: 75000,
      },
      {
        id: "wiring",
        name: "Electrical Wiring",
        unitPrice: 100000,
      },
      {
        id: "maintenance",
        name: "Electrical Maintenance",
        unitPrice: 50000,
      },
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
    description:
      "Professional website and application development.",
    options: [
      {
        id: "business-website",
        name: "Business Website",
        unitPrice: 150000,
      },
      {
        id: "ecommerce",
        name: "E-commerce Website",
        unitPrice: 250000,
      },
      {
        id: "mobile-app",
        name: "Mobile App",
        unitPrice: 400000,
      },
      {
        id: "web-app",
        name: "Web Application",
        unitPrice: 350000,
      },
      {
        id: "custom-software",
        name: "Custom Software",
        unitPrice: 500000,
      },
    ],
  },
];

function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG")}`;
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

export default function LemakExpertProduct() {
  const navigate = useNavigate();

  /*
   * Start with fallback products immediately.
   * This prevents the entire page from becoming unusable when
   * the expertProducts backend function is slow or unavailable.
   */
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [usingLiveProducts, setUsingLiveProducts] = useState(false);

  const [categoryId, setCategoryId] = useState("");
  const [optionId, setOptionId] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [bookingDate, setBookingDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /*
   * Load live products in the background.
   * The fallback products are already visible and selectable.
   */
  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      try {
        setLoadingProducts(true);

        const result = await base44.functions.invoke(
          "expertProducts",
          {}
        );

        const loaded = result?.data?.products;

        if (
          mounted &&
          Array.isArray(loaded) &&
          loaded.length > 0
        ) {
          setProducts(loaded);
          setUsingLiveProducts(true);
        }
      } catch (err) {
        console.error(
          "Lemak Expert live products unavailable:",
          err
        );

        /*
         * Do NOT replace products with an empty array.
         * The fallback services remain available.
         */
        if (mounted) {
          setUsingLiveProducts(false);
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

  const selectedCategory = useMemo(() => {
    return (
      products.find(
        (item) => item.id === categoryId
      ) || null
    );
  }, [products, categoryId]);

  const selectedOption = useMemo(() => {
    return (
      selectedCategory?.options?.find(
        (item) => item.id === optionId
      ) || null
    );
  }, [selectedCategory, optionId]);

  const total = useMemo(() => {
    if (!selectedOption) return 0;

    return (
      Number(selectedOption.unitPrice || 0) *
      Number(quantity || 1)
    );
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
    setQuantity((current) =>
      Math.min(10000, Number(current) + 1)
    );
  }

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, Number(current) - 1)
    );
  }

  function resetSelection() {
    setCategoryId("");
    setOptionId("");
    setQuantity(1);
    setBookingDate("");
    setLocation("");
    setNotes("");
    setError("");
    setSuccessMessage("");
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

    if (!selectedCategory || !selectedOption) {
      setError(
        "The selected service is no longer available. Please select it again."
      );
      return;
    }

    if (!bookingDate) {
      setError("Please select your service date.");
      return;
    }

    if (bookingDate < getToday()) {
      setError("Please select today or a future date.");
      return;
    }

    if (!location.trim()) {
      setError("Please enter the service location.");
      return;
    }

    const numericQuantity = Number(quantity);

    if (
      !Number.isInteger(numericQuantity) ||
      numericQuantity < 1
    ) {
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
          quantity: numericQuantity,
          bookingDate,
          location: location.trim(),
          notes: notes.trim(),
          callbackUrl: window.location.href,
        }
      );

      const data = result?.data;

      if (!data) {
        throw new Error(
          "The booking service did not return a response."
        );
      }

      if (!data.checkoutUrl) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to create the payment checkout."
        );
      }

      setSuccessMessage(
        "Booking created successfully. Redirecting to secure payment..."
      );

      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error(
        "Lemak Expert checkout error:",
        err
      );

      const backendError =
        err?.response?.data?.error ||
        err?.data?.error ||
        err?.message;

      setError(
        backendError ||
          "Unable to start payment. Please check your details and try again."
      );
    } finally {
      setLoadingCheckout(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={() => navigate("/app/services")}
            className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-lg font-black tracking-wide text-blue-700">
              <BriefcaseBusiness className="h-5 w-5" />
              LEMAK EXPERT
            </div>

            <div className="text-[11px] text-slate-500">
              Developed by MOSCO under Lemak Company
            </div>
          </div>

          <ShoppingBag className="h-5 w-5 text-blue-700" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        {/* HERO */}
        <section className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 to-blue-950 p-6 text-white shadow-xl sm:p-10">
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
              Book rentals, event planning, water production,
              electricity services, website development and
              custom applications through Lemak Expert.
            </p>
          </div>
        </section>

        {/* LIVE/FALLBACK STATUS */}
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="text-xs text-blue-800">
            {loadingProducts ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking for updated service prices...
              </span>
            ) : usingLiveProducts ? (
              <span>
                ✓ Live Lemak Expert services loaded.
              </span>
            ) : (
              <span>
                Lemak Expert services are ready to book.
              </span>
            )}
          </div>

          {!loadingProducts && !usingLiveProducts && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {successMessage && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
            {successMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* CATEGORY */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                    1
                  </span>

                  <h2 className="text-xl font-bold">
                    Choose a service
                  </h2>
                </div>

                <p className="text-sm text-slate-500">
                  Select the category that matches what
                  you need.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {products.map((product) => {
                  const active =
                    categoryId === product.id;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() =>
                        selectCategory(product.id)
                      }
                      className={`group w-full rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? "border-blue-600 bg-blue-50 shadow-sm ring-2 ring-blue-100"
                          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className={`font-bold ${
                              active
                                ? "text-blue-800"
                                : "text-slate-900"
                            }`}
                          >
                            {product.name}
                          </div>

                          <div className="mt-1 text-xs leading-5 text-slate-500">
                            {product.description}
                          </div>
                        </div>

                        <ChevronRight
                          className={`h-5 w-5 shrink-0 transition ${
                            active
                              ? "translate-x-1 text-blue-700"
                              : "text-slate-400 group-hover:text-blue-600"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* OPTIONS */}
            {selectedCategory && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                      2
                    </span>

                    <h2 className="text-xl font-bold">
                      Choose the service
                    </h2>
                  </div>

                  <p className="text-sm text-slate-500">
                    Choose an option under{" "}
                    <strong>
                      {selectedCategory.name}
                    </strong>
                    .
                  </p>
                </div>

                <div className="space-y-3">
                  {selectedCategory.options?.map(
                    (option) => {
                      const active =
                        optionId === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            selectOption(option.id)
                          }
                          className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                            active
                              ? "border-blue-600 bg-blue-50 shadow-sm ring-2 ring-blue-100"
                              : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <div
                              className={`font-semibold ${
                                active
                                  ? "text-blue-800"
                                  : "text-slate-900"
                              }`}
                            >
                              {option.name}
                            </div>

                            <div className="mt-1 text-sm text-slate-500">
                              {formatNaira(
                                option.unitPrice
                              )}{" "}
                              per unit
                            </div>
                          </div>

                          {active ? (
                            <CheckCircle2 className="h-6 w-6 shrink-0 text-blue-700" />
                          ) : (
                            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              </section>
            )}

            {/* DETAILS */}
            {selectedOption && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                      3
                    </span>

                    <h2 className="text-xl font-bold">
                      Booking details
                    </h2>
                  </div>

                  <p className="text-sm text-slate-500">
                    Give us the details required to
                    process your service.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* QUANTITY */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Quantity
                    </label>

                    <div className="flex w-fit items-center overflow-hidden rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={decreaseQuantity}
                        disabled={quantity <= 1}
                        className="p-3 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <input
                        type="number"
                        min={1}
                        max={10000}
                        value={quantity}
                        onChange={(event) => {
                          const parsed = parseInt(
                            event.target.value,
                            10
                          );
                          setQuantity(
                            Number.isNaN(parsed) || parsed < 1
                              ? 1
                              : Math.min(10000, parsed)
                          );
                        }}
                        className="w-20 border-0 bg-transparent py-2 text-center text-base font-bold focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />

                      <button
                        type="button"
                        onClick={increaseQuantity}
                        className="p-3 transition hover:bg-slate-100"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* BOOKING DATE */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Service date
                    </label>

                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="date"
                        min={getToday()}
                        value={bookingDate}
                        onChange={(event) =>
                          setBookingDate(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {/* LOCATION */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Location
                    </label>

                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="text"
                        placeholder="e.g. No. 2 Opeyemi, Zone 2, Alakia, Ibadan"
                        value={location}
                        onChange={(event) =>
                          setLocation(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {/* NOTES */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Additional notes{" "}
                      <span className="font-normal text-slate-400">
                        (optional)
                      </span>
                    </label>

                    <textarea
                      rows={3}
                      placeholder="Any extra details about the service..."
                      value={notes}
                      onChange={(event) =>
                        setNotes(event.target.value)
                      }
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* RIGHT — SUMMARY */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="mb-5 text-xl font-bold">
                Order summary
              </h2>

              {selectedOption ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      Service
                    </span>

                    <span className="max-w-[60%] truncate text-right font-semibold">
                      {selectedOption.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      Category
                    </span>

                    <span className="max-w-[60%] truncate text-right font-semibold">
                      {selectedCategory?.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      Unit price
                    </span>

                    <span className="font-semibold">
                      {formatNaira(selectedOption.unitPrice)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      Quantity
                    </span>

                    <span className="font-semibold">
                      {quantity}
                    </span>
                  </div>

                  <div className="my-2 border-t border-dashed border-slate-200" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">
                      Total
                    </span>

                    <span className="text-2xl font-black text-blue-700">
                      {formatNaira(total)}
                    </span>
                  </div>

                  <Button
                    className="mt-4 h-12 w-full text-base font-bold"
                    disabled={loadingCheckout}
                    onClick={handleCheckout}
                  >
                    {loadingCheckout ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-5 w-5" />
                        Pay with KoraPay
                      </>
                    )}
                  </Button>

                  <p className="mt-3 text-center text-[11px] text-slate-400">
                    You will be redirected to a secure payment
                    page. Wallet is not used for Expert
                    bookings.
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-slate-500">
                  Select a service to see your booking
                  summary.
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}