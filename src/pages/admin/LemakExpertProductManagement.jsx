import { useCallback, useEffect, useMemo, useState } from "react";

import {
  RefreshCw,
  Search,
  Eye,
  XCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  PackageCheck,
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  Banknote,
  Plus,
  Pencil,
  Trash2,
  Power,
  BriefcaseBusiness,
  ShoppingBag,
} from "lucide-react";

import { base44 } from "@/api/base44Client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ADMIN_FUNCTION_NAME =
  "expertAdmin";

const STATUS_OPTIONS = [
  {
    value: "awaiting_payment",
    label: "Awaiting Payment",
  },
  {
    value: "confirmed",
    label: "Confirmed",
  },
  {
    value: "processing",
    label: "Processing",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

const EMPTY_PRODUCT = {
  categoryId: "",
  categoryName: "",
  categoryDescription: "",
  optionId: "",
  optionName: "",
  description: "",
  unitPrice: "",
  imageUrl: "",
  sortOrder: 0,
};

function money(value) {
  return `₦${Number(
    value || 0
  ).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status) {
  switch (status) {
    case "awaiting_payment":
      return "bg-amber-100 text-amber-700";
    case "confirmed":
      return "bg-blue-100 text-blue-700";
    case "processing":
      return "bg-purple-100 text-purple-700";
    case "completed":
      return "bg-green-100 text-green-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function LemakExpertProductManagement() {
  const [tab, setTab] =
    useState("orders");

  const [bookings, setBookings] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [selectedBooking, setSelectedBooking] =
    useState(null);

  const [detailsOpen, setDetailsOpen] =
    useState(false);

  const [productOpen, setProductOpen] =
    useState(false);

  const [editingProduct, setEditingProduct] =
    useState(null);

  const [productForm, setProductForm] =
    useState(EMPTY_PRODUCT);

  const callAdmin = useCallback(
    async (payload = {}) => {
      const result =
        await base44.functions.invoke(
          ADMIN_FUNCTION_NAME,
          payload
        );

      return result?.data || result;
    },
    []
  );

  const loadAll = useCallback(
    async (refresh = false) => {
      try {
        setError("");

        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [bookingResult, productResult] =
          await Promise.all([
            callAdmin({
              action: "list",
            }),
            callAdmin({
              action: "products",
            }),
          ]);

        if (!bookingResult?.ok) {
          throw new Error(
            bookingResult?.error ||
              "Unable to load orders."
          );
        }

        if (!productResult?.ok) {
          throw new Error(
            productResult?.error ||
              "Unable to load products."
          );
        }

        setBookings(
          Array.isArray(
            bookingResult.bookings
          )
            ? bookingResult.bookings
            : []
        );

        setProducts(
          Array.isArray(
            productResult.products
          )
            ? productResult.products
            : []
        );
      } catch (err) {
        console.error(
          "Lemak Expert admin:",
          err
        );

        setError(
          err?.message ||
            "Unable to load Lemak Expert."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [callAdmin]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const updateStatus = async (
    booking,
    newStatus
  ) => {
    try {
      setSaving(true);
      setError("");

      const result =
        await callAdmin({
          action: "update_status",
          id: booking.id,
          bookingStatus: newStatus,
        });

      if (!result?.ok) {
        throw new Error(
          result?.error ||
            "Unable to update status."
        );
      }

      setBookings((items) =>
        items.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                bookingStatus:
                  newStatus,
              }
            : item
        )
      );

      setSelectedBooking((item) =>
        item?.id === booking.id
          ? {
              ...item,
              bookingStatus:
                newStatus,
            }
          : item
      );
    } catch (err) {
      setError(
        err?.message ||
          "Unable to update order."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (
    product
  ) => {
    if (
      !window.confirm(
        `Delete "${product.optionName}"?`
      )
    ) {
      return;
    }

    try {
      setSaving(true);

      const result =
        await callAdmin({
          action: "delete_product",
          id: product.id,
        });

      if (!result?.ok) {
        throw new Error(
          result?.error ||
            "Unable to delete product."
        );
      }

      setProducts((items) =>
        items.filter(
          (item) =>
            item.id !== product.id
        )
      );
    } catch (err) {
      setError(
        err?.message ||
          "Unable to delete product."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = async (
    product
  ) => {
    try {
      setSaving(true);

      const result =
        await callAdmin({
          action: "toggle_product",
          id: product.id,
        });

      if (!result?.ok) {
        throw new Error(
          result?.error ||
            "Unable to change product."
        );
      }

      setProducts((items) =>
        items.map((item) =>
          item.id === product.id
            ? result.product
            : item
        )
      );
    } catch (err) {
      setError(
        err?.message ||
          "Unable to change product."
      );
    } finally {
      setSaving(false);
    }
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm(
      EMPTY_PRODUCT
    );
    setProductOpen(true);
  };

  const openEditProduct = (
    product
  ) => {
    setEditingProduct(product);

    setProductForm({
      categoryId:
        product.categoryId || "",
      categoryName:
        product.categoryName || "",
      categoryDescription:
        product.categoryDescription ||
        "",
      optionId:
        product.optionId || "",
      optionName:
        product.optionName || "",
      description:
        product.description || "",
      unitPrice:
        product.unitPrice ?? "",
      imageUrl:
        product.imageUrl || "",
      sortOrder:
        product.sortOrder || 0,
    });

    setProductOpen(true);
  };

  const saveProduct = async () => {
    try {
      setSaving(true);
      setError("");

      const payload = {
        ...productForm,
        unitPrice: Number(
          productForm.unitPrice
        ),
        sortOrder: Number(
          productForm.sortOrder || 0
        ),
      };

      let result;

      if (editingProduct) {
        result =
          await callAdmin({
            action: "update_product",
            id: editingProduct.id,
            ...payload,
          });
      } else {
        result =
          await callAdmin({
            action: "create_product",
            ...payload,
          });
      }

      if (!result?.ok) {
        throw new Error(
          result?.error ||
            "Unable to save product."
        );
      }

      if (editingProduct) {
        setProducts((items) =>
          items.map((item) =>
            item.id ===
            editingProduct.id
              ? result.product
              : item
          )
        );
      } else {
        setProducts((items) => [
          ...items,
          result.product,
        ]);
      }

      setProductOpen(false);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to save product."
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredBookings =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return bookings.filter(
        (booking) => {
          const matchesSearch =
            !query ||
            [
              booking.id,
              booking.customerName,
              booking.customerEmail,
              booking.customerPhone,
              booking.categoryName,
              booking.optionName,
              booking.location,
              booking.paymentReference,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(query)
              );

          const matchesStatus =
            statusFilter === "all" ||
            booking.bookingStatus ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      bookings,
      search,
      statusFilter,
    ]);

  const stats = useMemo(() => {
    const revenue =
      bookings
        .filter(
          (item) =>
            String(
              item.paymentStatus ||
                ""
            ).toLowerCase() ===
            "paid"
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(
              item.amount || 0
            ),
          0
        );

    return {
      total: bookings.length,
      pending:
        bookings.filter(
          (item) =>
            item.bookingStatus ===
            "awaiting_payment"
        ).length,
      processing:
        bookings.filter(
          (item) =>
            item.bookingStatus ===
            "processing"
        ).length,
      completed:
        bookings.filter(
          (item) =>
            item.bookingStatus ===
            "completed"
        ).length,
      revenue,
    };
  }, [bookings]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">
              Lemak Expert
            </h1>
          </div>

          <p className="text-sm text-muted-foreground">
            Manage services, prices and customer orders.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => loadAll(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card>
          <CardContent className="p-5">
            <ShoppingBag className="mb-2 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">
              {stats.total}
            </p>
            <p className="text-xs text-muted-foreground">
              Total Orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <Clock3 className="mb-2 h-5 w-5 text-amber-500" />
            <p className="text-2xl font-bold">
              {stats.pending}
            </p>
            <p className="text-xs text-muted-foreground">
              Awaiting Payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <PackageCheck className="mb-2 h-5 w-5 text-purple-500" />
            <p className="text-2xl font-bold">
              {stats.processing}
            </p>
            <p className="text-xs text-muted-foreground">
              Processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <CheckCircle2 className="mb-2 h-5 w-5 text-green-500" />
            <p className="text-2xl font-bold">
              {stats.completed}
            </p>
            <p className="text-xs text-muted-foreground">
              Completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <Banknote className="mb-2 h-5 w-5 text-primary" />
            <p className="text-lg font-bold">
              {money(stats.revenue)}
            </p>
            <p className="text-xs text-muted-foreground">
              Paid Revenue
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b">
        <Button
          variant={
            tab === "orders"
              ? "default"
              : "ghost"
          }
          onClick={() =>
            setTab("orders")
          }
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          Orders
        </Button>

        <Button
          variant={
            tab === "products"
              ? "default"
              : "ghost"
          }
          onClick={() =>
            setTab("products")
          }
        >
          <BriefcaseBusiness className="mr-2 h-4 w-4" />
          Services & Prices
        </Button>
      </div>

      {tab === "orders" && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                className="pl-9"
                placeholder="Search customers, services, locations..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={
                setStatusFilter
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All statuses
                </SelectItem>

                {STATUS_OPTIONS.map(
                  (item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Customer Orders
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-3">
                        Customer
                      </th>
                      <th className="p-3">
                        Service
                      </th>
                      <th className="p-3">
                        Amount
                      </th>
                      <th className="p-3">
                        Payment
                      </th>
                      <th className="p-3">
                        Status
                      </th>
                      <th className="p-3">
                        Date
                      </th>
                      <th className="p-3">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBookings.map(
                      (booking) => (
                        <tr
                          key={booking.id}
                          className="border-b"
                        >
                          <td className="p-3">
                            <div className="font-medium">
                              {booking.customerName ||
                                "Customer"}
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {booking.customerEmail ||
                                "No email"}
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-medium">
                              {booking.categoryName ||
                                "Expert Service"}
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {booking.optionName ||
                                "Service"}
                            </div>
                          </td>

                          <td className="p-3 font-semibold">
                            {money(
                              booking.amount
                            )}
                          </td>

                          <td className="p-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs ${
                                String(
                                  booking.paymentStatus ||
                                    ""
                                ).toLowerCase() ===
                                "paid"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {booking.paymentStatus ||
                                "pending"}
                            </span>
                          </td>

                          <td className="p-3">
                            <Select
                              value={
                                booking.bookingStatus ||
                                "awaiting_payment"
                              }
                              onValueChange={(
                                value
                              ) =>
                                updateStatus(
                                  booking,
                                  value
                                )
                              }
                              disabled={
                                saving
                              }
                            >
                              <SelectTrigger
                                className={`h-8 w-44 text-xs ${statusClass(
                                  booking.bookingStatus
                                )}`}
                              >
                                <SelectValue />
                              </SelectTrigger>

                              <SelectContent>
                                {STATUS_OPTIONS.map(
                                  (item) => (
                                    <SelectItem
                                      key={
                                        item.value
                                      }
                                      value={
                                        item.value
                                      }
                                    >
                                      {item.label}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          </td>

                          <td className="p-3 text-xs text-muted-foreground">
                            {formatDate(
                              booking.created_date
                            )}
                          </td>

                          <td className="p-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBooking(
                                  booking
                                );
                                setDetailsOpen(
                                  true
                                );
                              }}
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              View
                            </Button>
                          </td>
                        </tr>
                      )
                    )}

                    {filteredBookings.length ===
                      0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-8 text-center text-muted-foreground"
                        >
                          No orders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "products" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              Services & Prices
            </CardTitle>

            <Button
              onClick={
                openCreateProduct
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add service
            </Button>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">
                      Category
                    </th>
                    <th className="p-3">
                      Service
                    </th>
                    <th className="p-3">
                      Price
                    </th>
                    <th className="p-3">
                      Status
                    </th>
                    <th className="p-3">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {products.map(
                    (product) => (
                      <tr
                        key={product.id}
                        className="border-b"
                      >
                        <td className="p-3">
                          {
                            product.categoryName
                          }
                        </td>

                        <td className="p-3 font-medium">
                          {
                            product.optionName
                          }
                        </td>

                        <td className="p-3 font-semibold">
                          {money(
                            product.unitPrice
                          )}
                        </td>

                        <td className="p-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              product.active !==
                              false
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {product.active !==
                            false
                              ? "Active"
                              : "Hidden"}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              disabled={
                                saving
                              }
                              onClick={() =>
                                openEditProduct(
                                  product
                                )
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              size="icon"
                              variant="outline"
                              disabled={
                                saving
                              }
                              onClick={() =>
                                toggleProduct(
                                  product
                                )
                              }
                            >
                              <Power className="h-4 w-4" />
                            </Button>

                            <Button
                              size="icon"
                              variant="outline"
                              disabled={
                                saving
                              }
                              onClick={() =>
                                deleteProduct(
                                  product
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}

                  {products.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No services yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ORDER DETAILS */}
      <Dialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Order details
            </DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                {selectedBooking.customerName ||
                  "Customer"}
              </div>

              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                {selectedBooking.customerEmail ||
                  "No email"}
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                {selectedBooking.customerPhone ||
                  "No phone"}
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {selectedBooking.location ||
                  "No location"}
              </div>

              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                {formatDate(
                  selectedBooking.bookingDate
                )}
              </div>

              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                {selectedBooking.paymentReference ||
                  "No reference"}
              </div>

              <div className="rounded-xl bg-muted p-4">
                <div className="flex justify-between">
                  <span>Service</span>
                  <span className="font-medium">
                    {
                      selectedBooking.categoryName
                    }{" "}
                    ·{" "}
                    {
                      selectedBooking.optionName
                    }
                  </span>
                </div>

                <div className="mt-2 flex justify-between">
                  <span>Quantity</span>
                  <span className="font-medium">
                    {selectedBooking.quantity ||
                      1}
                  </span>
                </div>

                <div className="mt-2 flex justify-between border-t pt-2 font-bold">
                  <span>Total</span>
                  <span>
                    {money(
                      selectedBooking.amount
                    )}
                  </span>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="rounded-xl border p-3">
                  <p className="mb-1 text-xs text-muted-foreground">
                    Notes
                  </p>
                  {selectedBooking.notes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD / EDIT SERVICE */}
      <Dialog
        open={productOpen}
        onOpenChange={setProductOpen}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct
                ? "Edit service"
                : "Add service"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Category ID (e.g. rentals)"
              value={
                productForm.categoryId
              }
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  categoryId:
                    e.target.value,
                })
              }
            />

            <Input
              placeholder="Category name"
              value={
                productForm.categoryName
              }
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  categoryName:
                    e.target.value,
                })
              }
            />

            <Input
              placeholder="Category description"
              value={
                productForm.categoryDescription
              }
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  categoryDescription:
                    e.target.value,
                })
              }
            />

            <Input
              placeholder="Service ID (e.g. chairs)"
              value={
                productForm.optionId
              }
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  optionId:
                    e.target.value,
                })
              }
            />

            <Input
              placeholder="Service name"
              value={
                productForm.optionName
              }
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  optionName:
                    e.target.value,
                })
              }
            />

            <Input
              placeholder="Description"
              value={
                productForm.description
              }
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  description:
                    e.target.value,
                })
              }
            />

            <Input
              type="number"
              placeholder="Price (NGN)"
              value={
                productForm.unitPrice
              }
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  unitPrice:
                    e.target.value,
                })
              }
            />

            <Input
              placeholder="Image URL"
              value={
                productForm.imageUrl
              }
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  imageUrl:
                    e.target.value,
                })
              }
            />

            <Input
              type="number"
              placeholder="Sort order"
              value={
                productForm.sortOrder
              }
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  sortOrder:
                    e.target.value,
                })
              }
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setProductOpen(false)
                }
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>

              <Button
                onClick={saveProduct}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}