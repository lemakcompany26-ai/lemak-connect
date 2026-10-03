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
  AlertCircle,
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

/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */

const ADMIN_FUNCTION_NAME = "expertAdmin";

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

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function formatMoney(value) {
  const amount = Number(value || 0);

  return `₦${amount.toLocaleString("en-NG", {
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

function getStatusLabel(status) {
  return (
    STATUS_OPTIONS.find(
      (item) => item.value === status
    )?.label ||
    status ||
    "Unknown"
  );
}

function getStatusClass(status) {
  switch (status) {
    case "awaiting_payment":
      return "bg-amber-100 text-amber-700 border-amber-200";

    case "confirmed":
      return "bg-blue-100 text-blue-700 border-blue-200";

    case "processing":
      return "bg-purple-100 text-purple-700 border-purple-200";

    case "completed":
      return "bg-green-100 text-green-700 border-green-200";

    case "cancelled":
      return "bg-red-100 text-red-700 border-red-200";

    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function getPaymentClass(status) {
  switch (String(status || "").toLowerCase()) {
    case "paid":
      return "bg-green-100 text-green-700 border-green-200";

    case "pending":
      return "bg-amber-100 text-amber-700 border-amber-200";

    case "failed":
      return "bg-red-100 text-red-700 border-red-200";

    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */

export default function LemakExpertProductmanagement() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const [detailsOpen, setDetailsOpen] = useState(false);

  const [error, setError] = useState("");

  /* -------------------------------------------------------
     API CALL
  ------------------------------------------------------- */

  const callAdmin = useCallback(async (payload = {}) => {
    const response = await base44.functions.invoke(
      ADMIN_FUNCTION_NAME,
      payload
    );

    return response?.data || response;
  }, []);

  /* -------------------------------------------------------
     LOAD BOOKINGS
  ------------------------------------------------------- */

  const loadBookings = useCallback(
    async (showRefresh = false) => {
      try {
        setError("");

        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result = await callAdmin({
          action: "list",
        });

        if (!result?.ok) {
          throw new Error(
            result?.error ||
              "Unable to load expert bookings."
          );
        }

        setBookings(
          Array.isArray(result.bookings)
            ? result.bookings
            : []
        );
      } catch (err) {
        console.error(
          "LemakExpertProductmanagement load error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load expert bookings."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [callAdmin]
  );

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  /* -------------------------------------------------------
     GET ONE BOOKING
  ------------------------------------------------------- */

  const openBooking = async (booking) => {
    if (!booking?.id) {
      setSelectedBooking(booking);
      setDetailsOpen(true);
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const result = await callAdmin({
        action: "get",
        id: booking.id,
      });

      if (!result?.ok) {
        throw new Error(
          result?.error ||
            "Unable to load booking."
        );
      }

      setSelectedBooking(
        result.booking || booking
      );

      setDetailsOpen(true);
    } catch (err) {
      console.error(
        "Get booking error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load booking."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* -------------------------------------------------------
     UPDATE STATUS
  ------------------------------------------------------- */

  const updateStatus = async (
    booking,
    newStatus
  ) => {
    if (!booking?.id || !newStatus) return;

    const oldStatus =
      booking.bookingStatus;

    if (oldStatus === newStatus) {
      return;
    }

    const confirmed = window.confirm(
      `Change booking status from "${getStatusLabel(
        oldStatus
      )}" to "${getStatusLabel(
        newStatus
      )}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const result = await callAdmin({
        action: "update_status",
        id: booking.id,
        bookingStatus: newStatus,
      });

      if (!result?.ok) {
        throw new Error(
          result?.error ||
            "Unable to update booking status."
        );
      }

      const updatedBooking =
        result.booking || {
          ...booking,
          bookingStatus: newStatus,
        };

      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id
            ? updatedBooking
            : item
        )
      );

      if (
        selectedBooking?.id ===
        booking.id
      ) {
        setSelectedBooking(
          updatedBooking
        );
      }
    } catch (err) {
      console.error(
        "Update booking status error:",
        err
      );

      setError(
        err?.message ||
          "Unable to update booking status."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* -------------------------------------------------------
     CANCEL UNPAID BOOKING
  ------------------------------------------------------- */

  const cancelBooking = async (booking) => {
    if (!booking?.id) return;

    if (
      String(
        booking.paymentStatus || ""
      ).toLowerCase() === "paid"
    ) {
      window.alert(
        "This booking has already been paid. The unpaid-booking cancellation action cannot be used."
      );

      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this unpaid booking?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const result = await callAdmin({
        action: "cancel",
        id: booking.id,
      });

      if (!result?.ok) {
        throw new Error(
          result?.error ||
            "Unable to cancel booking."
        );
      }

      const updatedBooking = {
        ...booking,
        bookingStatus: "cancelled",
      };

      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id
            ? updatedBooking
            : item
        )
      );

      if (
        selectedBooking?.id ===
        booking.id
      ) {
        setSelectedBooking(
          updatedBooking
        );
      }
    } catch (err) {
      console.error(
        "Cancel booking error:",
        err
      );

      setError(
        err?.message ||
          "Unable to cancel booking."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* -------------------------------------------------------
     FILTER BOOKINGS
  ------------------------------------------------------- */

  const filteredBookings = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesSearch =
        !query ||
        [
          booking.id,
          booking.name,
          booking.fullName,
          booking.customerName,
          booking.email,
          booking.phone,
          booking.service,
          booking.serviceName,
          booking.bookingReference,
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

      const matchesPayment =
        paymentFilter === "all" ||
        String(
          booking.paymentStatus || ""
        ).toLowerCase() ===
          paymentFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPayment
      );
    });
  }, [
    bookings,
    search,
    statusFilter,
    paymentFilter,
  ]);

  /* -------------------------------------------------------
     SUMMARY
  ------------------------------------------------------- */

  const summary = useMemo(() => {
    const total = bookings.length;

    const awaitingPayment =
      bookings.filter(
        (item) =>
          item.bookingStatus ===
          "awaiting_payment"
      ).length;

    const confirmed =
      bookings.filter(
        (item) =>
          item.bookingStatus ===
          "confirmed"
      ).length;

    const processing =
      bookings.filter(
        (item) =>
          item.bookingStatus ===
          "processing"
      ).length;

    const completed =
      bookings.filter(
        (item) =>
          item.bookingStatus ===
          "completed"
      ).length;

    const paid =
      bookings.filter(
        (item) =>
          String(
            item.paymentStatus || ""
          ).toLowerCase() === "paid"
      ).length;

    const revenue = bookings
      .filter(
        (item) =>
          String(
            item.paymentStatus || ""
          ).toLowerCase() === "paid"
      )
      .reduce(
        (totalAmount, item) =>
          totalAmount +
          Number(
            item.amount ||
              item.totalAmount ||
              item.price ||
              0
          ),
        0
      );

    return {
      total,
      awaitingPayment,
      confirmed,
      processing,
      completed,
      paid,
      revenue,
    };
  }, [bookings]);

  /* -------------------------------------------------------
     BOOKING DISPLAY HELPERS
  ------------------------------------------------------- */

  const getCustomerName = (booking) =>
    booking.customerName ||
    booking.fullName ||
    booking.name ||
    booking.userName ||
    "Unknown Customer";

  const getServiceName = (booking) =>
    booking.serviceName ||
    booking.service ||
    booking.productName ||
    booking.product ||
    "Expert Service";

  const getAmount = (booking) =>
    booking.amount ||
    booking.totalAmount ||
    booking.price ||
    booking.customerPrice ||
    0;

  /* -------------------------------------------------------
     LOADING
  ------------------------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">
            Loading expert bookings...
          </p>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Lemak Expert Product Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage expert service bookings,
            payments and booking status.
          </p>
        </div>

        <Button
          onClick={() =>
            loadBookings(true)
          }
          disabled={refreshing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </Button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div className="flex-1">
            <p className="font-semibold">
              Something went wrong
            </p>

            <p className="text-sm mt-1">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="text-red-500 hover:text-red-700"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* SUMMARY */}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          title="Total"
          value={summary.total}
          icon={PackageCheck}
        />

        <SummaryCard
          title="Awaiting Payment"
          value={summary.awaitingPayment}
          icon={Clock3}
        />

        <SummaryCard
          title="Confirmed"
          value={summary.confirmed}
          icon={CheckCircle2}
        />

        <SummaryCard
          title="Processing"
          value={summary.processing}
          icon={RefreshCw}
        />

        <SummaryCard
          title="Completed"
          value={summary.completed}
          icon={CheckCircle2}
        />

        <SummaryCard
          title="Paid"
          value={summary.paid}
          icon={CreditCard}
        />
      </div>

      {/* REVENUE */}

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-100 p-3 text-green-700">
              <Banknote className="h-6 w-6" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Paid Booking Revenue
              </p>

              <p className="text-2xl font-bold">
                {formatMoney(
                  summary.revenue
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FILTERS */}

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search customer, service, phone, email or booking ID..."
                className="pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={
                setStatusFilter
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Booking status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All Booking Statuses
                </SelectItem>

                {STATUS_OPTIONS.map(
                  (status) => (
                    <SelectItem
                      key={status.value}
                      value={status.value}
                    >
                      {status.label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            <Select
              value={paymentFilter}
              onValueChange={
                setPaymentFilter
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Payment status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All Payment Statuses
                </SelectItem>

                <SelectItem value="paid">
                  Paid
                </SelectItem>

                <SelectItem value="pending">
                  Pending
                </SelectItem>

                <SelectItem value="failed">
                  Failed
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* BOOKINGS */}

      <Card>
        <CardHeader>
          <CardTitle>
            Expert Product Bookings
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredBookings.length})
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {filteredBookings.length ===
          0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">
              <PackageCheck className="h-10 w-10 text-gray-300" />

              <h3 className="mt-3 font-semibold">
                No bookings found
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                No expert bookings match
                your current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-4">
                      Customer
                    </th>

                    <th className="px-5 py-4">
                      Service
                    </th>

                    <th className="px-5 py-4">
                      Amount
                    </th>

                    <th className="px-5 py-4">
                      Payment
                    </th>

                    <th className="px-5 py-4">
                      Booking Status
                    </th>

                    <th className="px-5 py-4">
                      Date
                    </th>

                    <th className="px-5 py-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.map(
                    (booking) => {
                      const isUnpaid =
                        String(
                          booking.paymentStatus ||
                            ""
                        ).toLowerCase() !==
                        "paid";

                      const cancellable =
                        isUnpaid &&
                        booking.bookingStatus !==
                          "cancelled";

                      return (
                        <tr
                          key={booking.id}
                          className="border-b text-sm transition hover:bg-gray-50"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-900">
                              {getCustomerName(
                                booking
                              )}
                            </div>

                            {booking.email && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                                <Mail className="h-3 w-3" />
                                {booking.email}
                              </div>
                            )}

                            {booking.phone && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                                <Phone className="h-3 w-3" />
                                {booking.phone}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-gray-900">
                              {getServiceName(
                                booking
                              )}
                            </div>

                            {booking.bookingReference && (
                              <div className="mt-1 font-mono text-xs text-gray-500">
                                {
                                  booking.bookingReference
                                }
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4 font-bold text-gray-900">
                            {formatMoney(
                              getAmount(booking)
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${getPaymentClass(
                                booking.paymentStatus
                              )}`}
                            >
                              {String(
                                booking.paymentStatus ||
                                  "unknown"
                              ).toLowerCase()}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                booking.bookingStatus
                              )}`}
                            >
                              {getStatusLabel(
                                booking.bookingStatus
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-gray-500">
                            {formatDate(
                              booking.createdAt ||
                                booking.createdDate ||
                                booking.updatedDate
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  openBooking(booking)
                                }
                                className="gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>

                              {cancellable && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={
                                    actionLoading
                                  }
                                  onClick={() =>
                                    cancelBooking(
                                      booking
                                    )
                                  }
                                  className="gap-1 border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DETAILS DIALOG */}

      <Dialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Booking Details
            </DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm">
                <InfoRow
                  icon={User}
                  label="Customer"
                  value={getCustomerName(
                    selectedBooking
                  )}
                />

                <InfoRow
                  icon={Mail}
                  label="Email"
                  value={
                    selectedBooking.email ||
                    "—"
                  }
                />

                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={
                    selectedBooking.phone ||
                    "—"
                  }
                />

                <InfoRow
                  icon={PackageCheck}
                  label="Service"
                  value={getServiceName(
                    selectedBooking
                  )}
                />

                <InfoRow
                  icon={MapPin}
                  label="Location"
                  value={
                    selectedBooking.location ||
                    selectedBooking.address ||
                    "—"
                  }
                />

                <InfoRow
                  icon={CalendarDays}
                  label="Service Date"
                  value={
                    selectedBooking.bookingDate ||
                    selectedBooking.serviceDate ||
                    "—"
                  }
                />

                <InfoRow
                  icon={Banknote}
                  label="Amount"
                  value={formatMoney(
                    getAmount(selectedBooking)
                  )}
                />

                <InfoRow
                  icon={CreditCard}
                  label="Payment Status"
                  value={String(
                    selectedBooking.paymentStatus ||
                      "unknown"
                  ).toLowerCase()}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Update Booking Status
                </label>

                <Select
                  value={
                    selectedBooking.bookingStatus ||
                    "awaiting_payment"
                  }
                  onValueChange={(value) =>
                    updateStatus(
                      selectedBooking,
                      value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Booking status" />
                  </SelectTrigger>

                  <SelectContent>
                    {STATUS_OPTIONS.map(
                      (status) => (
                        <SelectItem
                          key={status.value}
                          value={status.value}
                        >
                          {status.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedBooking.notes && (
                <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                  <span className="font-semibold text-gray-700">
                    Notes:{" "}
                  </span>
                  {selectedBooking.notes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------
   SUMMARY CARD
------------------------------------------------------- */

function SummaryCard({ title, value, icon: Icon }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs text-gray-500">
              {title}
            </p>

            <p className="text-xl font-bold">
              {Number(value || 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------
   INFO ROW
------------------------------------------------------- */

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border p-3">
      <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">
          {label}
        </p>

        <p className="break-words font-semibold text-gray-900">
          {value}
        </p>
      </div>
    </div>
  );
}