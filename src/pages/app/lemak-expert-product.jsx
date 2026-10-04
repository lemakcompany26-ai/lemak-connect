import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  ImageOff,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { base44 } from "@/api/base44Client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FALLBACK_PRODUCTS = [
  {
    id: "rentals-chairs",
    categoryId: "rentals",
    categoryName: "Rentals",
    categoryDescription:
      "Canopies, chairs, tables and event equipment.",
    optionId: "chairs",
    optionName: "Plastic Chairs",
    description:
      "Quality plastic chairs for events.",
    unitPrice: 500,
    imageUrl: "",
  },
  {
    id: "rentals-tables",
    categoryId: "rentals",
    categoryName: "Rentals",
    categoryDescription:
      "Canopies, chairs, tables and event equipment.",
    optionId: "tables",
    optionName: "Tables",
    description:
      "Strong tables for events.",
    unitPrice: 1500,
    imageUrl: "",
  },
  {
    id: "rentals-canopies",
    categoryId: "rentals",
    categoryName: "Rentals",
    categoryDescription:
      "Canopies, chairs, tables and event equipment.",
    optionId: "canopies",
    optionName: "Canopies",
    description:
      "Large event canopies.",
    unitPrice: 15000,
    imageUrl: "",
  },
  {
    id: "event-wedding",
    categoryId: "event-planning",
    categoryName: "Event Planning",
    categoryDescription:
      "Professional event planning.",
    optionId: "wedding",
    optionName: "Wedding Planning",
    description:
      "Complete wedding planning.",
    unitPrice: 150000,
    imageUrl: "",
  },
  {
    id: "event-birthday",
    categoryId: "event-planning",
    categoryName: "Event Planning",
    categoryDescription:
      "Professional event planning.",
    optionId: "birthday",
    optionName: "Birthday Planning",
    description:
      "Birthday event planning.",
    unitPrice: 75000,
    imageUrl: "",
  },
  {
    id: "water-sachet",
    categoryId: "water-production",
    categoryName: "Water Production",
    categoryDescription:
      "Water production and branding.",
    optionId: "sachet",
    optionName: "Sachet Water",
    description:
      "Sachet water production.",
    unitPrice: 25000,
    imageUrl: "",
  },
  {
    id: "electricity",
    categoryId: "electricity",
    categoryName:
      "Electricity Engineering",
    categoryDescription:
      "Professional electrical services.",
    optionId: "installation",
    optionName:
      "Electrical Installation",
    description:
      "Professional electrical installation.",
    unitPrice: 75000,
    imageUrl: "",
  },
  {
    id: "fumigation",
    categoryId: "fumigation",
    categoryName: "Fumigation",
    categoryDescription:
      "Professional pest control.",
    optionId:
      "home-fumigation",
    optionName:
      "Home Fumigation",
    description:
      "Residential fumigation.",
    unitPrice: 50000,
    imageUrl: "",
  },
  {
    id: "website",
    categoryId:
      "website-app-development",
    categoryName:
      "Website & App Development",
    categoryDescription:
      "Professional software development.",
    optionId:
      "business-website",
    optionName:
      "Business Website",
    description:
      "Professional business website.",
    unitPrice: 150000,
    imageUrl: "",
  },
];

function money(value) {
  return `₦${Number(
    value || 0
  ).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function LemakExpertProduct() {
  const navigate = useNavigate();

  const [products, setProducts] =
    useState(FALLBACK_PRODUCTS);

  const [loading, setLoading] =
    useState(true);

  const [selectedCategory, setSelectedCategory] =
    useState("rentals");

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [quantity, setQuantity] =
    useState(1);

  const [bookingDate, setBookingDate] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [paying, setPaying] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadProducts =
    useCallback(async () => {
      try {
        setLoading(true);

        const response =
          await base44.functions.invoke(
            "expertProducts",
            {}
          );

        const data =
          response?.data ||
          response;

        if (
          data?.ok &&
          Array.isArray(
            data.products
          ) &&
          data.products.length > 0
        ) {
          setProducts(
            data.products
          );
        }
      } catch (err) {
        console.error(
          "expertProducts:",
          err
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = useMemo(() => {
    const map =
      new Map();

    products.forEach(
      (product) => {
        if (!map.has(product.categoryId)) {
          map.set(
            product.categoryId,
            {
              id:
                product.categoryId,
              name:
                product.categoryName,
              description:
                product.categoryDescription ||
                "",
            }
          );
        }
      }
    );

    return Array.from(
      map.values()
    );
  }, [products]);

  useEffect(() => {
    if (
      categories.length &&
      !categories.some(
        (item) =>
          item.id ===
          selectedCategory
      )
    ) {
      setSelectedCategory(
        categories[0].id
      );
    }
  }, [
    categories,
    selectedCategory,
  ]);

  const categoryProducts =
    useMemo(
      () =>
        products.filter(
          (item) =>
            item.categoryId ===
              selectedCategory &&
            item.active !== false
        ),
      [
        products,
        selectedCategory,
      ]
    );

  const selectedCategoryInfo =
    categories.find(
      (item) =>
        item.id ===
        selectedCategory
    );

  const total =
    Number(
      selectedProduct?.unitPrice ||
        0
    ) *
    Number(quantity || 1);

  const chooseProduct = (
    product
  ) => {
    setSelectedProduct(
      product
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
      Math.min(
        10000,
        value + 1
      )
    );
  };

  const handleCheckout =
    async () => {
      setError("");

      if (!selectedProduct) {
        setError(
          "Please select a service."
        );
        return;
      }

      if (
        !bookingDate
      ) {
        setError(
          "Please select your booking date."
        );
        return;
      }

      if (!location.trim()) {
        setError(
          "Please enter your location."
        );
        return;
      }

      try {
        const selectedDate =
          new Date(
            bookingDate
          );

        if (
          Number.isNaN(
            selectedDate.getTime()
          ) ||
          selectedDate.getTime() <=
            Date.now()
        ) {
          setError(
            "Please select a future booking date."
          );
          return;
        }
      } catch {
        setError(
          "Invalid booking date."
        );
        return;
      }

      try {
        setPaying(true);

        const response =
          await base44.functions.invoke(
            "expertBookingCheckout",
            {
              categoryId:
                selectedProduct.categoryId,

              optionId:
                selectedProduct.optionId,

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
          response?.data ||
          response;

        if (!data?.ok) {
          throw new Error(
            data?.error ||
              "Unable to start payment."
          );
        }

        if (
          !data?.checkoutUrl
        ) {
          throw new Error(
            "Payment provider did not return a checkout URL."
          );
        }

        window.location.href =
          data.checkoutUrl;
      } catch (err) {
        console.error(
          "Expert checkout:",
          err
        );

        setError(
          err?.message ||
            "Unable to start payment."
        );

        setPaying(false);
      }
    };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                navigate(-1)
              }
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div>
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="h-6 w-6 text-primary" />

                <h1 className="text-lg font-bold">
                  Lemak Expert
                </h1>
              </div>

              <p className="text-xs text-muted-foreground">
                Professional services by Lemak Company
              </p>
            </div>
          </div>

          <ShoppingBag className="h-5 w-5 text-primary" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6">
        <section className="overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground md:p-10">
          <div className="max-w-3xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest opacity-80">
              LEMAK EXPERT
            </p>

            <h2 className="text-3xl font-bold md:text-5xl">
              Book the service you need.
            </h2>

            <p className="mt-4 max-w-2xl text-sm opacity-90 md:text-base">
              Rentals, events, water production,
              electrical engineering, fumigation,
              design and software development —
              all in one place.
            </p>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-bold">
              Choose a service
            </h2>

            <p className="text-sm text-muted-foreground">
              Select a category to see available services.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {categories.map(
              (category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(
                      category.id
                    );
                    setSelectedProduct(
                      null
                    );
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedCategory ===
                    category.id
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "hover:border-primary/50"
                  }`}
                >
                  <BriefcaseBusiness className="mb-3 h-6 w-6 text-primary" />

                  <p className="font-semibold">
                    {category.name}
                  </p>

                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {
                      category.description
                    }
                  </p>
                </button>
              )
            )}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-bold">
              {
                selectedCategoryInfo?.name ||
                "Available Services"
              }
            </h2>

            <p className="text-sm text-muted-foreground">
              Select the exact service you want.
            </p>
          </div>

          {loading && (
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading live services...
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoryProducts.map(
              (product) => {
                const selected =
                  selectedProduct?.id ===
                  product.id;

                return (
                  <button
                    key={product.id}
                    onClick={() =>
                      chooseProduct(
                        product
                      )
                    }
                    className={`overflow-hidden rounded-2xl border text-left transition ${
                      selected
                        ? "border-primary ring-2 ring-primary"
                        : "hover:-translate-y-1 hover:shadow-lg"
                    }`}
                  >
                    <div className="relative h-44 bg-muted">
                      {product.imageUrl ? (
                        <img
                          src={
                            product.imageUrl
                          }
                          alt={
                            product.optionName
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageOff className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}

                      {selected && (
                        <div className="absolute right-3 top-3 rounded-full bg-primary p-2 text-primary-foreground">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      <div>
                        <p className="font-bold">
                          {
                            product.optionName
                          }
                        </p>

                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {
                            product.description
                          }
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">
                          {money(
                            product.unitPrice
                          )}
                        </span>

                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </section>

        {selectedProduct && (
          <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-8">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                Selected service
              </p>

              <h2 className="text-2xl font-bold">
                {
                  selectedProduct.optionName
                }
              </h2>

              <p className="text-sm text-muted-foreground">
                {
                  selectedProduct.categoryName
                }
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Quantity
                  </label>

                  <div className="flex w-fit items-center rounded-xl border">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={
                        decreaseQuantity
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    <span className="w-12 text-center font-bold">
                      {quantity}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={
                        increaseQuantity
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Booking date
                  </label>

                  <Input
                    type="datetime-local"
                    value={
                      bookingDate
                    }
                    onChange={(e) =>
                      setBookingDate(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4 text-primary" />
                    Service location
                  </label>

                  <Input
                    placeholder="Enter the location where the service is needed"
                    value={
                      location
                    }
                    onChange={(e) =>
                      setLocation(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Additional notes
                  </label>

                  <textarea
                    className="min-h-28 w-full rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Tell us anything important about your order..."
                    value={notes}
                    onChange={(e) =>
                      setNotes(
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-muted p-5">
                <h3 className="text-lg font-bold">
                  Booking summary
                </h3>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>
                      Service
                    </span>

                    <span className="font-medium">
                      {
                        selectedProduct.optionName
                      }
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      Category
                    </span>

                    <span className="font-medium">
                      {
                        selectedProduct.categoryName
                      }
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      Unit price
                    </span>

                    <span className="font-medium">
                      {money(
                        selectedProduct.unitPrice
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      Quantity
                    </span>

                    <span className="font-medium">
                      {quantity}
                    </span>
                  </div>

                  <div className="flex justify-between border-t pt-3 text-base font-bold">
                    <span>
                      Total
                    </span>

                    <span>
                      {money(total)}
                    </span>
                  </div>
                </div>

                <Button
                  className="mt-6 h-12 w-full text-base font-bold"
                  disabled={paying}
                  onClick={
                    handleCheckout
                  }
                >
                  {paying ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    `Pay ${money(total)}`
                  )}
                </Button>

                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Paid securely before service
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}