import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const emptyForm = () => ({
  code: "",
  min_funding: 5000,
  benefit: "BONUS_CREDIT",
  bonus_amount: 500,
  max_uses: 100,
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .slice(0, 10),
  active: true,
});

export default function PromoCodesPage() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    load();
  }, []);

  const normalizePromo = (p) => ({
    ...p,
    code: String(p.code || "").toUpperCase(),
    min_funding: Number(
      p.min_funding ?? p.minFunding ?? p.minPurchase ?? 0
    ),
    bonus_amount: Number(
      p.bonus_amount ?? p.bonusAmount ?? p.discountValue ?? 0
    ),
    max_uses: Number(p.max_uses ?? p.maxUses ?? 0),
    current_uses: Number(p.current_uses ?? p.currentUses ?? 0),
    benefit: p.benefit || "BONUS_CREDIT",
    active:
      p.active !== undefined
        ? Boolean(p.active)
        : p.isActive !== undefined
        ? Boolean(p.isActive)
        : true,
    start_date: p.start_date
      ? new Date(p.start_date).toISOString().slice(0, 10)
      : p.startDate
      ? new Date(p.startDate).toISOString().slice(0, 10)
      : "",
    end_date: p.end_date
      ? new Date(p.end_date).toISOString().slice(0, 10)
      : p.expiresAt
      ? new Date(p.expiresAt).toISOString().slice(0, 10)
      : "",
  });

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await base44.functions.invoke("getPromoCodes", {});
      const data = response?.data ?? response;

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.promos)
        ? data.promos
        : Array.isArray(data?.promoCodes)
        ? data.promoCodes
        : [];

      setPromos(list.map(normalizePromo));
    } catch (err) {
      console.error("LOAD PROMOS ERROR:", err);

      setError(
        err?.response?.data?.error ||
          err?.data?.error ||
          err?.message ||
          "Unable to load promo codes."
      );

      setPromos([]);
    } finally {
      setLoading(false);
    }
  };

  const createPromo = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    const code = String(form.code || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    if (!code) {
      setError("Promo code is required.");
      return;
    }

    const minFunding = Number(form.min_funding);

    if (!Number.isFinite(minFunding) || minFunding < 0) {
      setError("Enter a valid minimum funding amount.");
      return;
    }

    const bonusAmount = Number(form.bonus_amount);

    if (
      form.benefit === "BONUS_CREDIT" &&
      (!Number.isFinite(bonusAmount) || bonusAmount <= 0)
    ) {
      setError("Enter a valid promo bonus amount.");
      return;
    }

    const maxUses = Number(form.max_uses);

    if (!Number.isFinite(maxUses) || maxUses <= 0) {
      setError("Maximum uses must be greater than 0.");
      return;
    }

    if (form.end_date < form.start_date) {
      setError("End date cannot be before start date.");
      return;
    }

    setCreating(true);

    try {
      /*
       * IMPORTANT:
       * Only the backend creates the PromoCode.
       *
       * Do NOT also call:
       * base44.entities.PromoCode.create(...)
       *
       * Doing both was one of the bugs in the old page.
       */
      const response = await base44.functions.invoke("createPromoCode", {
        code,

        min_funding: minFunding,

        benefit: form.benefit,

        bonus_amount:
          form.benefit === "BONUS_CREDIT"
            ? bonusAmount
            : 0,

        max_uses: maxUses,

        start_date: new Date(
          `${form.start_date}T00:00:00`
        ).toISOString(),

        end_date: new Date(
          `${form.end_date}T23:59:59`
        ).toISOString(),

        active: Boolean(form.active),
      });

      const data = response?.data ?? response;

      if (data?.success === false) {
        throw new Error(
          data.error ||
            data.message ||
            "Promo code could not be created."
        );
      }

      const createdPromo = normalizePromo(
        data?.promo || data?.promoCode || data
      );

      /*
       * If backend returns the created promo, add it immediately.
       * Otherwise reload from backend.
       */
      if (createdPromo?.code) {
        setPromos((current) => [
          createdPromo,
          ...current.filter(
            (p) => p.code !== createdPromo.code
          ),
        ]);
      } else {
        await load();
      }

      setForm(emptyForm());

      setMessage(
        `Promo code ${code} created successfully.`
      );
    } catch (err) {
      console.error("CREATE PROMO ERROR:", err);

      const backendError =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.data?.error ||
        err?.data?.message ||
        err?.message ||
        "Promo code could not be created.";

      setError(backendError);
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (promo) => {
    setMessage("");
    setError("");

    const newStatus = !promo.active;

    try {
      const response = await base44.functions.invoke(
        "updatePromoCode",
        {
          code: promo.code,
          active: newStatus,
        }
      );

      const data = response?.data ?? response;

      if (data?.success === false) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to update promo."
        );
      }

      setPromos((current) =>
        current.map((p) =>
          p.code === promo.code
            ? { ...p, active: newStatus }
            : p
        )
      );

      setMessage(
        `${promo.code} ${
          newStatus ? "enabled" : "disabled"
        }.`
      );
    } catch (err) {
      console.error("TOGGLE PROMO ERROR:", err);

      setError(
        err?.response?.data?.error ||
          err?.data?.error ||
          err?.message ||
          "Unable to update promo."
      );
    }
  };

  const remove = async (promo) => {
    if (!window.confirm(`Delete ${promo.code}?`)) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await base44.functions.invoke(
        "deletePromoCode",
        {
          code: promo.code,
        }
      );

      const data = response?.data ?? response;

      if (data?.success === false) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to delete promo."
        );
      }

      setPromos((current) =>
        current.filter((p) => p.code !== promo.code)
      );

      setMessage(`${promo.code} deleted successfully.`);
    } catch (err) {
      console.error("DELETE PROMO ERROR:", err);

      setError(
        err?.response?.data?.error ||
          err?.data?.error ||
          err?.message ||
          "Unable to delete promo."
      );
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-lg font-semibold">
          Loading promo codes...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">
          Promo Codes Manager
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Create multiple promo codes with funding
          requirements and automatic bonus eligibility.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 text-green-700 px-4 py-3">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      {/* CREATE */}
      <form
        onSubmit={createPromo}
        className="bg-white border rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div>
          <label className="text-xs font-semibold">
            PROMO CODE
          </label>

          <input
            value={form.code}
            onChange={(e) =>
              setForm({
                ...form,
                code: e.target.value
                  .toUpperCase()
                  .replace(/\s+/g, ""),
              })
            }
            className="w-full border rounded-lg px-3 h-10 font-bold"
            placeholder="WELCOME500"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold">
            MINIMUM FUNDING ₦
          </label>

          <input
            type="number"
            min="0"
            value={form.min_funding}
            onChange={(e) =>
              setForm({
                ...form,
                min_funding: e.target.value,
              })
            }
            className="w-full border rounded-lg px-3 h-10"
          />

          <p className="text-[11px] text-gray-500 mt-1">
            User must successfully fund at least this amount.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold">
            BONUS AMOUNT ₦
          </label>

          <input
            type="number"
            min="0"
            value={form.bonus_amount}
            onChange={(e) =>
              setForm({
                ...form,
                bonus_amount: e.target.value,
              })
            }
            className="w-full border rounded-lg px-3 h-10"
          />
        </div>

        <div>
          <label className="text-xs font-semibold">
            MAX USES
          </label>

          <input
            type="number"
            min="1"
            value={form.max_uses}
            onChange={(e) =>
              setForm({
                ...form,
                max_uses: e.target.value,
              })
            }
            className="w-full border rounded-lg px-3 h-10"
          />
        </div>

        <div>
          <label className="text-xs font-semibold">
            BENEFIT
          </label>

          <select
            value={form.benefit}
            onChange={(e) =>
              setForm({
                ...form,
                benefit: e.target.value,
              })
            }
            className="w-full border rounded-lg px-3 h-10"
          >
            <option value="BONUS_CREDIT">
              BONUS CREDIT
            </option>

            <option value="DISCOUNT">
              DISCOUNT
            </option>

            <option value="INSTANT_SIGNUP">
              INSTANT SIGNUP
            </option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold">
            START DATE
          </label>

          <input
            type="date"
            value={form.start_date}
            onChange={(e) =>
              setForm({
                ...form,
                start_date: e.target.value,
              })
            }
            className="w-full border rounded-lg px-3 h-10"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold">
            END DATE
          </label>

          <input
            type="date"
            value={form.end_date}
            onChange={(e) =>
              setForm({
                ...form,
                end_date: e.target.value,
              })
            }
            className="w-full border rounded-lg px-3 h-10"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold">
            STATUS
          </label>

          <select
            value={form.active ? "active" : "inactive"}
            onChange={(e) =>
              setForm({
                ...form,
                active: e.target.value === "active",
              })
            }
            className="w-full border rounded-lg px-3 h-10"
          >
            <option value="active">ACTIVE</option>
            <option value="inactive">INACTIVE</option>
          </select>
        </div>

        <div className="md:col-span-2 lg:col-span-4">
          <button
            type="submit"
            disabled={creating}
            className="w-full bg-black text-white h-11 rounded-xl font-bold disabled:opacity-50"
          >
            {creating
              ? "Creating Promo..."
              : "+ Create Promo LIVE"}
          </button>
        </div>
      </form>

      {/* LIST */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-bold">
            Existing Promo Codes
          </h2>

          <p className="text-xs text-gray-500">
            {promos.length} promo code
            {promos.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                <th className="p-3 text-left">Code</th>
                <th className="p-3 text-left">Benefit</th>
                <th className="p-3 text-left">
                  Minimum Funding
                </th>
                <th className="p-3 text-left">
                  Bonus
                </th>
                <th className="p-3 text-left">
                  Uses
                </th>
                <th className="p-3 text-left">
                  Dates
                </th>
                <th className="p-3 text-left">
                  Status
                </th>
                <th className="p-3 text-left">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {promos.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="p-8 text-center text-gray-500"
                  >
                    No promo codes found.
                  </td>
                </tr>
              ) : (
                promos.map((p) => {
                  const expired =
                    p.end_date &&
                    new Date(p.end_date + "T23:59:59") <
                      new Date();

                  const exhausted =
                    p.max_uses > 0 &&
                    p.current_uses >= p.max_uses;

                  return (
                    <tr
                      key={p.code}
                      className="border-b"
                    >
                      <td className="p-3 font-bold">
                        {p.code}
                      </td>

                      <td className="p-3 text-xs">
                        {p.benefit}
                      </td>

                      <td className="p-3">
                        ₦
                        {Number(
                          p.min_funding || 0
                        ).toLocaleString()}
                      </td>

                      <td className="p-3">
                        ₦
                        {Number(
                          p.bonus_amount || 0
                        ).toLocaleString()}
                      </td>

                      <td className="p-3">
                        {p.current_uses || 0} /{" "}
                        {p.max_uses || "∞"}
                      </td>

                      <td className="p-3 text-xs">
                        {p.start_date || "-"}
                        <br />
                        →
                        <br />
                        {p.end_date || "-"}
                      </td>

                      <td className="p-3">
                        {expired ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                            EXPIRED
                          </span>
                        ) : exhausted ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                            USED UP
                          </span>
                        ) : p.active ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                            OFF
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => toggle(p)}
                            className="px-3 py-1 bg-gray-900 text-white rounded-lg text-xs"
                          >
                            {p.active
                              ? "Disable"
                              : "Enable"}
                          </button>

                          <button
                            type="button"
                            onClick={() => remove(p)}
                            className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
    }
