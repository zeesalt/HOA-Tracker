import { useState, useEffect, useMemo, useRef } from "react";
import {
  BRAND, CATEGORIES, CATEGORY_EMOJIS, STATUSES, ROLES, DEFAULT_SETTINGS,
  MOBILE_BP, IRS_MILEAGE_RATE,
  PURCHASE_CATEGORIES, PURCHASE_CATEGORY_EMOJIS, PAYMENT_METHODS,
  useIsMobile, useOnline,
  uid, fmt, fmtHours, todayStr, nowTime, relativeDate,
  calcHours, calcLabor, calcMaterialsTotal, formatDate, timeAgo, formatTime, getUserRate,
  compressImage,
  Icon, StatusBadge, catColors, CategoryBadge, RoleBadge,
  S, Field, Modal, ConfirmDialog, StatCard,
  ImageUploader, MaterialsEditor,
} from "../shared";

export const PurchaseEntryForm = ({ entry, settings, currentUser, onSave, onCancel, onSubmit, onDelete, mob }) => {
  const [form, setForm] = useState({
    userId: entry?.userId || currentUser?.id,
    date: entry?.date || todayStr(),
    storeName: entry?.storeName || "",
    category: entry?.category || "",
    description: entry?.description || "",
    items: entry?.items?.length ? entry.items : [{ id: uid(), name: "", quantity: 1, unitCost: 0 }],
    tax: entry?.tax || 0,
    mileage: entry?.mileage || "",
    paymentMethod: entry?.paymentMethod || "",
    receiptUrls: entry?.receiptUrls || [],
    photoUrls: entry?.photoUrls || [],
    notes: entry?.notes || "",
    status: entry?.status || "Draft",
  });
  const [errors, setErrors] = useState({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptWarningDismissed, setReceiptWarningDismissed] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Item management
  const addItem = () => set("items", [...form.items, { id: uid(), name: "", quantity: 1, unitCost: 0 }]);
  const updateItem = (i, field, val) => {
    const next = [...form.items];
    next[i] = { ...next[i], [field]: val };
    set("items", next);
  };
  const removeItem = (i) => set("items", form.items.filter((_, idx) => idx !== i));

  // Calculations
  const subtotal = form.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0), 0);
  const tax = Number(form.tax) || 0;
  const mileageRate = settings?.mileageRate || IRS_MILEAGE_RATE;
  const mileageVal = Number(form.mileage) || 0;
  const mileageTotal = mileageVal > 0 ? Math.round(mileageVal * mileageRate * 100) / 100 : 0;
  const grandTotal = subtotal + tax + mileageTotal;

  const validate = () => {
    const e = {};
    if (!form.storeName.trim()) e.storeName = "Store name is required";
    if (!form.category) e.category = "Select a category";
    if (!form.items.some(item => item.name?.trim())) e.items = "Add at least one item";
    if (grandTotal <= 0) e.total = "Total must be greater than zero";
    if (form.date > todayStr()) e.date = "Date cannot be in the future";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    const data = { ...form, subtotal, tax, total: grandTotal, mileageRate: mileageVal > 0 ? mileageRate : null, mileageTotal, status: "Draft" };
    await onSave(data, entry?.id);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const data = { ...form, subtotal, tax, total: grandTotal, mileageRate: mileageVal > 0 ? mileageRate : null, mileageTotal, status: "Submitted" };
    await onSubmit(data, entry?.id);
    setSubmitting(false);
  };

  const noReceipt = form.receiptUrls.length === 0 && !receiptWarningDismissed;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Date + Store */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 16 }}>
        <Field label="Purchase Date" required>
          <input type="date" style={{ ...S.input, borderColor: errors.date ? BRAND.error : BRAND.border }} value={form.date} onChange={e => set("date", e.target.value)} />
          {errors.date && <div style={{ color: BRAND.error, fontSize: 12, marginTop: 4 }}>{errors.date}</div>}
        </Field>
        <Field label="Store Name" required>
          <input style={{ ...S.input, borderColor: errors.storeName ? BRAND.error : BRAND.border }} value={form.storeName} onChange={e => set("storeName", e.target.value)} placeholder="e.g. Home Depot, Target" />
          {errors.storeName && <div style={{ color: BRAND.error, fontSize: 12, marginTop: 4 }}>{errors.storeName}</div>}
        </Field>
      </div>

      {/* Category + Payment */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 16 }}>
        <Field label="Category" required>
          <select style={{ ...S.select, borderColor: errors.category ? BRAND.error : BRAND.border }} value={form.category} onChange={e => set("category", e.target.value)}>
            <option value="">Select category...</option>
            {PURCHASE_CATEGORIES.map(c => <option key={c} value={c}>{PURCHASE_CATEGORY_EMOJIS[c] || ""} {c}</option>)}
          </select>
          {errors.category && <div style={{ color: BRAND.error, fontSize: 12, marginTop: 4 }}>{errors.category}</div>}
        </Field>
        <Field label="Payment Method">
          <select style={S.select} value={form.paymentMethod} onChange={e => set("paymentMethod", e.target.value)}>
            <option value="">Select...</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Description / Purpose">
        <input style={S.input} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What was this purchase for?" />
      </Field>

      {/* Line Items */}
      <div>
        <div style={{ ...S.sectionLabel, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>🛒 Items</span>
          <button type="button" style={{ ...S.btnGhost, fontSize: 12, padding: "4px 12px" }} onClick={addItem}><Icon name="plus" size={14} /> Add Item</button>
        </div>
        {errors.items && <div style={{ color: BRAND.error, fontSize: 12, marginBottom: 8 }}>{errors.items}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {form.items.map((item, i) => (
            <div key={item.id || i} style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "2fr 80px 100px 90px 36px", gap: 8, alignItems: "end", padding: 12, background: BRAND.bgSoft, borderRadius: 8, border: "1px solid " + BRAND.borderLight }}>
              <div>
                {mob && <div style={{ fontSize: 11, color: BRAND.textLight, marginBottom: 3 }}>Item Name</div>}
                <input style={{ ...S.input, padding: "8px 10px", fontSize: 13 }} value={item.name} onChange={e => updateItem(i, "name", e.target.value)} placeholder="Item name" />
              </div>
              <div>
                {mob && <div style={{ fontSize: 11, color: BRAND.textLight, marginBottom: 3 }}>Qty</div>}
                <input type="number" min="0.01" step="1" style={{ ...S.input, padding: "8px 10px", fontSize: 13, textAlign: "right" }} value={item.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} />
              </div>
              <div>
                {mob && <div style={{ fontSize: 11, color: BRAND.textLight, marginBottom: 3 }}>Unit Cost ($)</div>}
                <input type="number" min="0" step="0.01" style={{ ...S.input, padding: "8px 10px", fontSize: 13, textAlign: "right" }} value={item.unitCost} onChange={e => updateItem(i, "unitCost", e.target.value)} placeholder="0.00" />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.charcoal, textAlign: "right", padding: "8px 0" }}>
                {fmt((Number(item.quantity) || 0) * (Number(item.unitCost) || 0))}
              </div>
              {form.items.length > 1 && (
                <button type="button" onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: BRAND.error, cursor: "pointer", padding: 4 }} title="Remove item"><Icon name="x" size={16} /></button>
              )}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ marginTop: 16, padding: "14px 16px", background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
            <span style={{ color: BRAND.textMuted }}>Subtotal</span>
            <span style={{ fontWeight: 600 }}>{fmt(subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 14 }}>
            <span style={{ color: BRAND.textMuted }}>Tax</span>
            <input type="number" min="0" step="0.01" style={{ ...S.input, width: 100, padding: "6px 10px", fontSize: 13, textAlign: "right" }} value={form.tax} onChange={e => set("tax", e.target.value)} placeholder="0.00" />
          </div>
          {mileageTotal > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
              <span style={{ color: BRAND.textMuted }}>Mileage ({mileageVal} mi × {fmt(mileageRate)}/mi)</span>
              <span style={{ fontWeight: 600 }}>{fmt(mileageTotal)}</span>
            </div>
          )}
          <div style={{ borderTop: "2px solid " + BRAND.navy, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 16 }}>
            <span style={{ fontWeight: 700, color: BRAND.navy }}>Grand Total</span>
            <span style={{ fontWeight: 700, color: BRAND.navy }}>{fmt(grandTotal)}</span>
          </div>
          {errors.total && <div style={{ color: BRAND.error, fontSize: 12, marginTop: 6 }}>{errors.total}</div>}
        </div>
      </div>

      {/* Mileage */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 16 }}>
        <Field label="Round-trip Mileage (optional)">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="number" min="0" step="0.1" style={{ ...S.input, flex: 1 }} value={form.mileage} onChange={e => set("mileage", e.target.value)} placeholder="0" />
            <span style={{ fontSize: 12, color: BRAND.textLight, whiteSpace: "nowrap" }}>@ {fmt(mileageRate)}/mi</span>
          </div>
        </Field>
      </div>

      {/* Receipts */}
      <ImageUploader images={form.receiptUrls.map((url, i) => ({ id: "r" + i, dataUrl: url }))} onChange={(imgs) => set("receiptUrls", imgs.map(img => img.dataUrl))} label="📎 Receipts" color={BRAND.brick} icon="receipt" mob={mob} />
      {noReceipt && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 8, fontSize: 13, color: "#92400E" }}>
          <span>⚠️</span>
          <span style={{ flex: 1 }}>No receipt attached. Consider adding one for faster approval.</span>
          <button style={{ ...S.btnGhost, fontSize: 12, padding: "4px 10px" }} onClick={() => setReceiptWarningDismissed(true)}>Dismiss</button>
        </div>
      )}

      {/* Photos */}
      <ImageUploader images={form.photoUrls.map((url, i) => ({ id: "p" + i, dataUrl: url }))} onChange={(imgs) => set("photoUrls", imgs.map(img => img.dataUrl))} label="📷 Photos" color={BRAND.green} icon="camera" mob={mob} />

      {/* Notes */}
      <Field label="Notes">
        <textarea style={{ ...S.input, minHeight: 80 }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any additional notes..." />
      </Field>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btnSecondary} onClick={onCancel}>Cancel</button>
          {entry?.id && entry?.status === "Draft" && (
            <button style={{ ...S.btnGhost, color: BRAND.error }} onClick={() => setShowDeleteConfirm(true)}>
              <Icon name="trash" size={16} /> Delete
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btnSecondary} onClick={handleSave}><Icon name="save" size={16} /> Save Draft</button>
          <button style={{ ...S.btnPrimary, opacity: submitting ? 0.6 : 1 }} disabled={submitting} onClick={() => setShowSubmitConfirm(true)}>
            <Icon name="send" size={16} /> {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>

      <ConfirmDialog open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)} onConfirm={handleSubmit}
        title="Submit Purchase Entry?" message={`Submit ${form.storeName || "this purchase"} for ${fmt(grandTotal)} to the Treasurer for review?`} confirmText="Submit" />
      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={() => onDelete && onDelete()} title="Delete Draft?" message="This purchase entry draft will be permanently deleted." confirmText="Delete" danger />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PURCHASE ENTRY DETAIL
// ═══════════════════════════════════════════════════════════════════════════
