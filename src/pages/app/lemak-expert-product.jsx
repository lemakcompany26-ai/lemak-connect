import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

const FALLBACK_PRODUCTS = [
  {
    id: "rentals",
    name: "Rentals",
    description:
      "Chairs, tables, canopies and professional event equipment.",
    image:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=85",
    options: [
      {
        id: "chairs",
        name: "Plastic Chairs",
        unitPrice: 500,
        image:
          "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "tables",
        name: "Tables",
        unitPrice: 1500,
        image:
          "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "canopies",
        name: "Canopies",
        unitPrice: 15000,
        image:
          "https://images.unsplash.com/photo-1478146896981-b80fe463b330?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "event_equipment",
        name: "Event Equipment",
        unitPrice: 25000,
        image:
          "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },

  {
    id: "event-planning",
    name: "Event Planning",
    description:
      "Complete event planning, decoration and coordination.",
    image:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=85",
    options: [
      {
        id: "wedding",
        name: "Wedding Planning",
        unitPrice: 150000,
        image:
          "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "birthday",
        name: "Birthday Planning",
        unitPrice: 75000,
        image:
          "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "house-warming",
        name: "House Warming",
        unitPrice: 60000,
        image:
          "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "corporate",
        name: "Corporate Event",
        unitPrice: 150000,
        image:
          "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "full-planning",
        name: "Full Event Planning",
        unitPrice: 200000,
        image:
          "https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "decoration",
        name: "Event Decoration",
        unitPrice: 100000,
        image:
          "https://images.unsplash.com/photo-1478146896981-b80fe463b330?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },

  {
    id: "water-production",
    name: "Water Production",
    description:
      "Water production, bulk supply and custom branded water.",
    image:
      "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=1200&q=85",
    options: [
      {
        id: "sachet",
        name: "Sachet Water",
        unitPrice: 25000,
        image:
          "https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "bottled",
        name: "Bottled Water",
        unitPrice: 50000,
        image:
          "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "custom-branded",
        name: "Custom Branded Water",
        unitPrice: 100000,
        image:
          "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "bulk",
        name: "Bulk Water Production",
        unitPrice: 75000,
        image:
          "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },

  {
    id: "electricity",
    name: "Electricity",
    description:
      "Electrical installation, wiring, maintenance and engineering.",
    image:
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=85",
    options: [
      {
        id: "installation",
        name: "Electrical Installation",
        unitPrice: 75000,
        image:
          "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "wiring",
        name: "Electrical Wiring",
        unitPrice: 100000,
        image:
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "maintenance",
        name: "Electrical Maintenance",
        unitPrice: 50000,
        image:
          "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "generator",
        name: "Generator / Electrical Engineering",
        unitPrice: 100000,
        image:
          "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },

  {
    id: "website-app-development",
    name: "Website & App Development",
    description:
      "Professional websites, mobile apps and custom software.",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=85",
    options: [
      {
        id: "business-website",
        name: "Business Website",
        unitPrice: 150000,
        image:
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "ecommerce",
        name: "E-commerce Website",
        unitPrice: 250000,
        image:
          "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "mobile-app",
        name: "Mobile App",
        unitPrice: 400000,
        image:
          "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "web-app",
        name: "Web Application",
        unitPrice: 350000,
        image:
          "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "custom-software",
        name: "Custom Software",
        unitPrice: 500000,
        image:
          "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
];

const formatNaira = (value) =>
  `₦${Number(value || 0).toLocaleString("en-NG")}`;

function ServiceImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}
      >
        <ShoppingBag className="h-10 w-10" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

export default function LemakExpertProduct() {
  const navigate = useNavigate();

  const [products, setProducts] =
    useState(FALLBACK_PRODUCTS);

  const [selectedCategoryId, setSelectedCategoryId] =
    useState("rentals");

  const [selectedOptionId, setSelectedOptionId] =
    useState("chairs");

  const [quantity, setQuantity] =
    useState(1);

  const [bookingDate, setBookingDate] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  const [checkoutLoading, setCheckoutLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [showCheckout, setShowCheckout] =
    useState(false);

  const selectedCategory =
    products.find(
      (item) =>
        item.id === selectedCategoryId
    ) || products[0];

  const filteredProducts =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return products;
      }

      return products.filter((item) => {
        const categoryText =
          `${item.name} ${item.description}`.toLowerCase();

        const optionText =
          item.options
            ?.map(
              (option) =>
                `${option.name}`
            )
            .join(" ")
            .toLowerCase() || "";

        return (
          categoryText.includes(query) ||
          optionText.includes(query)
        );
      });
    }, [products, search]);

  const selectedOption =
    selectedCategory?.options?.find(
      (item) =>
        item.id === selectedOptionId
    ) ||
    selectedCategory?.options?.[0];

  const total =
    Number(
      selectedOption?.unitPrice || 0
    ) * quantity;

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      setLoadingProducts(true);

      try {
        const result =
          await base44.functions.invoke(
            "expertProducts",
            {}
          );

        const loaded =
          result?.data?.products;

        if (
          mounted &&
          Array.isArray(loaded) &&
          loaded.length > 0
        ) {
          setProducts(
            loaded.map((category) => {
              const fallback =
                FALLBACK_PRODUCTS.find(
                  (item) =>
                    item.id === category.id
                );

              return {
                ...category,
                image:
                  category.image ||
                  fallback?.image,
                options:
                  Array.isArray(
                    category.options
                  )
                    ? category.options.map(
                        (option) => {
                          const fallbackOption =
                            fallback?.options?.find(
                              (item) =>
                                item.id ===
                                option.id
                            );

                          return {
                            ...option,
                            image:
                              option.image ||
                              fallbackOption?.image,
                          };
                        }
                      )
                    : [],
              };
            })
          );
        }
      } catch (err) {
        console.error(
          "expertProducts:",
          err
        );
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

  useEffect(() => {
    if (!selectedCategory) return;

    const exists =
      selectedCategory.options?.some(
        (item) =>
          item.id ===
          selectedOptionId
      );

    if (!exists) {
      setSelectedOptionId(
        selectedCategory.options?.[0]?.id ||
          ""
      );
    }
  }, [
    selectedCategory,
    selectedOptionId,
  ]);

  const selectCategory = (category) => {
    setSelectedCategoryId(
      category.id
    );

    setSelectedOptionId(
      category.options?.[0]?.id ||
        ""
    );

    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const selectOption = (option) => {
    setSelectedOptionId(
      option.id
    );

    setError("");
  };

  const decreaseQuantity = () => {
    setQuantity((value) =>
      Math.max(1, value - 1)
    );
  };

  const increaseQuantity = () => {
    setQuantity((value) =>
      Math.min(10000, value + 1)
    );
  };

  const handleCheckout = async () => {
    setError("");

    if (!selectedCategory) {
      setError(
        "Please select a service."
      );
      return;
    }

    if (!selectedOption) {
      setError(
        "Please select a service option."
      );
      return;
    }

    if (!bookingDate) {
      setError(
        "Please select your service date."
      );
      return;
    }

    if (!location.trim()) {
      setError(
        "Please enter the service location."
      );
      return;
    }

    const selectedDate =
      new Date(
        `${bookingDate}T00:00:00`
      );

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    if (selectedDate < today) {
      setError(
        "Please select today or a future date."
      );
      return;
    }

    try {
      setCheckoutLoading(true);

      const result =
        await base44.functions.invoke(
          "expertBookingCheckout",
          {
            categoryId:
              selectedCategory.id,

            optionId:
              selectedOption.id,

            quantity:
              Number(quantity),

            bookingDate,

            location:
              location.trim(),

            notes:
              notes.trim(),

            callbackUrl:
              window.location.href,
          }
        );

      const data =
        result?.data || {};

      if (!data.checkoutUrl) {
        throw new Error(
          data.error ||
            "Payment checkout could not be created."
        );
      }

      window.location.href =
        data.checkoutUrl;
    } catch (err) {
      console.error(
        "expertBookingCheckout:",
        err
      );

      setError(
        err?.message ||
          "Unable to start payment. Please try again."
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* TOP BAR */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <button
            onClick={() =>
              navigate("/app/services")
            }
            className="flex h-10 w-10 items-center justify-center rounded-full border bg-white hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-blue-600">
              LEMAK CONNECT
            </p>

            <h1 className="truncate text-lg font-bold text-slate-900">
              Lemak Expert
            </h1>
          </div>

          <div className="hidden items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 sm:flex">
            <ShieldCheck className="h-4 w-4" />
            Secure booking
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Professional services by Lemak Company
            </div>

            <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Book a service.
              <br />
              Get it done professionally.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              From event rentals and planning to
              water production, electrical engineering,
              websites and mobile applications —
              choose a service and book directly.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 text-sm text-white">
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                <ShieldCheck className="h-4 w-4" />
                Secure payment
              </div>

              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                <Clock3 className="h-4 w-4" />
                Fast response
              </div>

              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                <Users className="h-4 w-4" />
                Professional team
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4">
        {/* SEARCH */}
        <div className="-mt-6 rounded-2xl border bg-white p-3 shadow-lg">
          <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3">
            <Search className="h-5 w-5 text-slate-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search services..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />

            {search && (
              <button
                onClick={() =>
                  setSearch("")
                }
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* CATEGORY CARDS */}
        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                EXPLORE SERVICES
              </p>

              <h3 className="mt-1 text-2xl font-bold text-slate-900">
                What do you need?
              </h3>
            </div>

            {loadingProducts && (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {filteredProducts.map(
              (category) => {
                const active =
                  category.id ===
                  selectedCategoryId;

                return (
                  <button
                    key={category.id}
                    onClick={() =>
                      selectCategory(
                        category
                      )
                    }
                    className={`group overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-1 hover:shadow-lg ${
                      active
                        ? "border-blue-600 ring-2 ring-blue-100"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="relative h-32 overflow-hidden">
                      <ServiceImage
                        src={
                          category.image
                        }
                        alt={
                          category.name
                        }
                        className="h-full w-full transition duration-500 group-hover:scale-105"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                      {active && (
                        <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Check className="h-4 w-4" />
                        </div>
                      )}

                      <
