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

export const ReportsPage = ({ entries, purchaseEntries, users, settings, currentUser, mob }) => {
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; });
  const [dateTo, setDateTo] = useState(todayStr());
  const [filterUser, setFilterUser] = useState("all");
  const [filterStatus, setFilterStatus] = useState(STATUSES.APPROVED);
  const [generated, setGenerated] = useState(false);
  const isTreasurer = currentUser.role === ROLES.TREASURER;

  const filtered = useMemo(() => entries.filter(e => {
    if (e.date < dateFrom || e.date > dateTo) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (!isTreasurer && e.userId !== currentUser.id) return false;
    if (isTreasurer && filterUser !== "all" && e.userId !== filterUser) return false;
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date)), [entries, dateFrom, dateTo, filterUser, filterStatus, isTreasurer, currentUser.id]);

  const filteredPurchases = useMemo(() => (purchaseEntries || []).filter(e => {
    if (e.date < dateFrom || e.date > dateTo) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (!isTreasurer && e.userId !== currentUser.id) return false;
    if (isTreasurer && filterUser !== "all" && e.userId !== filterUser) return false;
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date)), [purchaseEntries, dateFrom, dateTo, filterUser, filterStatus, isTreasurer, currentUser.id]);

  const purchaseTotals = useMemo(() => {
    let total = 0;
    filteredPurchases.forEach(e => { total += e.total || 0; });
    return total;
  }, [filteredPurchases]);

  const totals = useMemo(() => {
    let totalHours = 0, totalLabor = 0, totalMat = 0;
    filtered.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); totalHours += h; totalLabor += calcLabor(h, r); totalMat += calcMaterialsTotal(e.materials); });
    return { totalHours, totalLabor, totalMat, grand: totalLabor + totalMat };
  }, [filtered, settings]);

  const exportCSV = () => {
    const header = "Type,Date,Member,Category,Description,Hours,Rate,Labor,Materials,Total";
    const workRows = filtered.map(e => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); const l = calcLabor(h, r); const m = calcMaterialsTotal(e.materials); return 'Work,' + e.date + ',"' + (u?.name || "") + '","' + e.category + '","' + e.description.replace(/"/g, '""') + '",' + h.toFixed(2) + ',' + r.toFixed(2) + ',' + l.toFixed(2) + ',' + m.toFixed(2) + ',' + (l + m).toFixed(2); });
    const purchRows = filteredPurchases.map(e => { const u = users.find(u => u.id === e.userId); return 'Purchase,' + e.date + ',"' + (u?.name || "") + '","' + e.category + '","' + (e.storeName || "").replace(/"/g, '""') + " — " + (e.description || "").replace(/"/g, '""') + '",,,,' + (e.total || 0).toFixed(2) + ',' + (e.total || 0).toFixed(2); });
    const csv = [header, ...workRows, ...purchRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = settings.hoaName.replace(/\s+/g, "_") + "_Report.csv"; a.click();
  };

  // ── PDF Export ──────────────────────────────────────────────────────────
  const exportPDF = () => {
    const periodLabel = formatDate(dateFrom) + " – " + formatDate(dateTo);
    const generatedOn = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const statusLabel = filterStatus === "all" ? "All Statuses" : filterStatus;
    const memberLabel = filterUser === "all" ? "All Members" : (users.find(u => u.id === filterUser)?.name || "");

    // Group by member for individual sections
    const byMember = {};
    filtered.forEach(e => {
      const uid = e.userId;
      if (!byMember[uid]) byMember[uid] = [];
      byMember[uid].push(e);
    });

    const fmtC = (n) => "$" + n.toFixed(2);
    const fmtH = (n) => n.toFixed(2) + "h";

    const entryRows = filtered.map(e => {
      const u = users.find(u => u.id === e.userId);
      const h = calcHours(e.startTime, e.endTime);
      const r = getUserRate(users, settings, e.userId);
      const labor = calcLabor(h, r);
      const mat = calcMaterialsTotal(e.materials);
      return `<tr>
        <td>${formatDate(e.date)}</td>
        <td>${u?.name || "—"}</td>
        <td>${e.category}</td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.description}</td>
        <td style="text-align:right">${fmtH(h)}</td>
        <td style="text-align:right">${fmtC(r)}/hr</td>
        <td style="text-align:right">${fmtC(labor)}</td>
        <td style="text-align:right">${fmtC(mat)}</td>
        <td style="text-align:right;font-weight:700">${fmtC(labor + mat)}</td>
      </tr>`;
    }).join("");

    // Per-member summary rows
    const memberSummaryRows = Object.entries(byMember).map(([uid, ents]) => {
      const u = users.find(u => u.id === uid);
      let hrs = 0, labor = 0, mat = 0;
      ents.forEach(e => {
        const h = calcHours(e.startTime, e.endTime);
        const r = getUserRate(users, settings, e.userId);
        hrs += h; labor += calcLabor(h, r); mat += calcMaterialsTotal(e.materials);
      });
      return `<tr>
        <td style="font-weight:600">${u?.name || "Unknown"}</td>
        <td style="text-align:right">${ents.length}</td>
        <td style="text-align:right">${fmtH(hrs)}</td>
        <td style="text-align:right">${fmtC(labor)}</td>
        <td style="text-align:right">${fmtC(mat)}</td>
        <td style="text-align:right;font-weight:700">${fmtC(labor + mat)}</td>
      </tr>`;
    }).join("");

    const purchaseRows = filteredPurchases.map(e => {
      const u = users.find(u => u.id === e.userId);
      return `<tr>
        <td>${formatDate(e.date)}</td>
        <td>${u?.name || "—"}</td>
        <td>${e.category}</td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(e.storeName || "") + " — " + (e.description || "")}</td>
        <td style="text-align:right;font-weight:700">${fmtC(e.total || 0)}</td>
      </tr>`;
    }).join("");

    const combinedGrand = totals.grand + purchaseTotals;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${settings.hoaName} — Reimbursement Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; font-size: 12px; color: #1a1a1a; padding: 32px 40px; }
  .header { border-bottom: 3px solid #2C3E50; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #2C3E50; margin-bottom: 4px; }
  .header .meta { font-size: 11px; color: #666; display: flex; gap: 24px; flex-wrap: wrap; margin-top: 8px; }
  .header .meta span { font-family: Arial, sans-serif; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #2C3E50; 
       border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 20px 0 12px; }
  table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; }
  th { background: #2C3E50; color: #fff; padding: 6px 8px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  tr:nth-child(even) td { background: #F8F9FA; }
  .totals-row td { background: #EEF2F7 !important; font-weight: 700; border-top: 2px solid #2C3E50; font-size: 12px; }
  .grand-total { background: #2C3E50; color: #fff; padding: 10px 16px; margin-top: 16px; 
                 display: flex; justify-content: space-between; border-radius: 4px; font-family: Arial, sans-serif; }
  .grand-total .label { font-size: 12px; font-weight: 600; }
  .grand-total .value { font-size: 16px; font-weight: 700; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; 
            font-size: 10px; color: #999; font-family: Arial, sans-serif; display: flex; justify-content: space-between; }
  @media print {
    body { padding: 16px 20px; }
    @page { margin: 16mm 12mm; size: landscape; }
  }
</style>
</head><body>
  <div class="header">
    <h1>${settings.hoaName}</h1>
    <div style="font-size:15px;color:#555;margin-top:2px;font-family:Arial,sans-serif">Reimbursement Report</div>
    <div class="meta">
      <span><strong>Period:</strong> ${periodLabel}</span>
      <span><strong>Status filter:</strong> ${statusLabel}</span>
      ${memberLabel ? `<span><strong>Member:</strong> ${memberLabel}</span>` : ""}
      <span><strong>Rate:</strong> $${settings.defaultHourlyRate}/hr (default)</span>
      <span><strong>Generated:</strong> ${generatedOn}</span>
      <span><strong>Entries:</strong> ${filtered.length} work + ${filteredPurchases.length} purchase</span>
    </div>
  </div>

  <h2>Summary by Member</h2>
  <table>
    <thead><tr><th>Member</th><th style="text-align:right">Entries</th><th style="text-align:right">Hours</th><th style="text-align:right">Labor</th><th style="text-align:right">Materials</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>
      ${memberSummaryRows}
      <tr class="totals-row">
        <td>TOTAL</td>
        <td style="text-align:right">${filtered.length}</td>
        <td style="text-align:right">${fmtH(totals.totalHours)}</td>
        <td style="text-align:right">${fmtC(totals.totalLabor)}</td>
        <td style="text-align:right">${fmtC(totals.totalMat)}</td>
        <td style="text-align:right">${fmtC(totals.grand)}</td>
      </tr>
    </tbody>
  </table>

  <h2>Itemized Work Entries</h2>
  <table>
    <thead><tr><th>Date</th><th>Member</th><th>Category</th><th>Description</th><th style="text-align:right">Hours</th><th style="text-align:right">Rate</th><th style="text-align:right">Labor</th><th style="text-align:right">Materials</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>
      ${entryRows}
      <tr class="totals-row">
        <td colspan="4">TOTALS</td>
        <td style="text-align:right">${fmtH(totals.totalHours)}</td>
        <td></td>
        <td style="text-align:right">${fmtC(totals.totalLabor)}</td>
        <td style="text-align:right">${fmtC(totals.totalMat)}</td>
        <td style="text-align:right">${fmtC(totals.grand)}</td>
      </tr>
    </tbody>
  </table>

  ${filteredPurchases.length > 0 ? `
  <h2>Purchase Entries</h2>
  <table>
    <thead><tr><th>Date</th><th>Member</th><th>Category</th><th>Store / Description</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>
      ${purchaseRows}
      <tr class="totals-row">
        <td colspan="4">PURCHASE TOTAL</td>
        <td style="text-align:right">${fmtC(purchaseTotals)}</td>
      </tr>
    </tbody>
  </table>` : ""}

  <div class="grand-total">
    <span class="label">Grand Total Reimbursement${filteredPurchases.length > 0 ? " (Work + Purchases)" : ""}</span>
    <span class="value">${fmtC(combinedGrand)}</span>
  </div>

  <div class="footer">
    <span>${settings.hoaName} — Confidential</span>
    <span>Generated ${generatedOn} · ${periodLabel}</span>
  </div>
</body></html>`;

    const win = window.open("", "_blank", "width=1100,height=800");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  // ── Fiscal Year Report (CPA-ready) ──────────────────────────────────────
  const exportFiscalYear = (year) => {
    const yrEntries = entries.filter(e => e.date.startsWith(String(year)) && (e.status === "Approved" || e.status === "Paid"));
    const yrPurchases = (purchaseEntries || []).filter(e => e.date.startsWith(String(year)) && (e.status === "Approved" || e.status === "Paid"));

    // By Category
    const byCat = {};
    CATEGORIES.forEach(c => { byCat[c] = { labor: 0, materials: 0, hours: 0, count: 0 }; });
    yrEntries.forEach(e => {
      const h = calcHours(e.startTime, e.endTime);
      const r = getUserRate(users, settings, e.userId);
      if (!byCat[e.category]) byCat[e.category] = { labor: 0, materials: 0, hours: 0, count: 0 };
      byCat[e.category].labor += calcLabor(h, r);
      byCat[e.category].materials += calcMaterialsTotal(e.materials);
      byCat[e.category].hours += h;
      byCat[e.category].count += 1;
    });

    // By Member (work)
    const byMember = {};
    yrEntries.forEach(e => {
      const u = users.find(u => u.id === e.userId);
      const name = u?.name || "Unknown";
      if (!byMember[name]) byMember[name] = { labor: 0, materials: 0, hours: 0, count: 0, purchases: 0 };
      const h = calcHours(e.startTime, e.endTime);
      const r = getUserRate(users, settings, e.userId);
      byMember[name].labor += calcLabor(h, r);
      byMember[name].materials += calcMaterialsTotal(e.materials);
      byMember[name].hours += h;
      byMember[name].count += 1;
    });
    // Add purchase totals to member
    yrPurchases.forEach(e => {
      const u = users.find(u => u.id === e.userId);
      const name = u?.name || "Unknown";
      if (!byMember[name]) byMember[name] = { labor: 0, materials: 0, hours: 0, count: 0, purchases: 0 };
      byMember[name].purchases += e.total || 0;
      byMember[name].count += 1;
    });

    // By Month
    const byMonth = {};
    yrEntries.forEach(e => {
      const mo = e.date.slice(0, 7);
      if (!byMonth[mo]) byMonth[mo] = { labor: 0, materials: 0, hours: 0, count: 0, purchases: 0 };
      const h = calcHours(e.startTime, e.endTime);
      const r = getUserRate(users, settings, e.userId);
      byMonth[mo].labor += calcLabor(h, r);
      byMonth[mo].materials += calcMaterialsTotal(e.materials);
      byMonth[mo].hours += h;
      byMonth[mo].count += 1;
    });
    yrPurchases.forEach(e => {
      const mo = e.date.slice(0, 7);
      if (!byMonth[mo]) byMonth[mo] = { labor: 0, materials: 0, hours: 0, count: 0, purchases: 0 };
      byMonth[mo].purchases += e.total || 0;
      byMonth[mo].count += 1;
    });

    let totalLabor = 0, totalMat = 0, totalHrs = 0, totalPurchases = 0;
    yrEntries.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); totalLabor += calcLabor(h, r); totalMat += calcMaterialsTotal(e.materials); totalHrs += h; });
    yrPurchases.forEach(e => { totalPurchases += e.total || 0; });

    // Build CSV with multiple sections
    const lines = [];
    lines.push(settings.hoaName + " — Fiscal Year Report " + year);
    lines.push("Generated: " + new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
    lines.push("Default Hourly Rate: $" + settings.defaultHourlyRate);
    lines.push("Work Entries: " + yrEntries.length + " | Purchase Entries: " + yrPurchases.length + " (Approved + Paid)");
    lines.push("");
    lines.push("═══ SUMMARY ═══");
    lines.push("Total Labor,$" + totalLabor.toFixed(2));
    lines.push("Total Materials,$" + totalMat.toFixed(2));
    lines.push("Total Purchases,$" + totalPurchases.toFixed(2));
    lines.push("Grand Total,$" + (totalLabor + totalMat + totalPurchases).toFixed(2));
    lines.push("Total Hours," + totalHrs.toFixed(2));
    lines.push("");
    lines.push("═══ BY CATEGORY (Chart of Accounts — Work Entries) ═══");
    lines.push("Category,Entries,Hours,Labor,Materials,Total");
    Object.entries(byCat).filter(([_, d]) => d.count > 0).sort((a, b) => (b[1].labor + b[1].materials) - (a[1].labor + a[1].materials)).forEach(([cat, d]) => {
      lines.push('"' + cat + '",' + d.count + "," + d.hours.toFixed(2) + "," + d.labor.toFixed(2) + "," + d.materials.toFixed(2) + "," + (d.labor + d.materials).toFixed(2));
    });
    lines.push("");
    lines.push("═══ BY MEMBER ═══");
    lines.push("Member,Entries,Hours,Labor,Materials,Purchases,Total");
    Object.entries(byMember).sort((a, b) => (b[1].labor + b[1].materials + (b[1].purchases || 0)) - (a[1].labor + a[1].materials + (a[1].purchases || 0))).forEach(([name, d]) => {
      lines.push('"' + name + '",' + d.count + "," + d.hours.toFixed(2) + "," + d.labor.toFixed(2) + "," + d.materials.toFixed(2) + "," + (d.purchases || 0).toFixed(2) + "," + (d.labor + d.materials + (d.purchases || 0)).toFixed(2));
    });
    lines.push("");
    lines.push("═══ BY MONTH ═══");
    lines.push("Month,Entries,Hours,Labor,Materials,Purchases,Total");
    Object.keys(byMonth).sort().forEach(mo => {
      const d = byMonth[mo];
      const monthLabel = new Date(mo + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" });
      lines.push(monthLabel + "," + d.count + "," + d.hours.toFixed(2) + "," + d.labor.toFixed(2) + "," + d.materials.toFixed(2) + "," + (d.purchases || 0).toFixed(2) + "," + (d.labor + d.materials + (d.purchases || 0)).toFixed(2));
    });
    lines.push("");
    lines.push("═══ ITEMIZED WORK ENTRIES ═══");
    lines.push("Date,Member,Category,Description,Hours,Rate,Labor,Materials,Total,Status");
    yrEntries.sort((a, b) => a.date.localeCompare(b.date)).forEach(e => {
      const u = users.find(u => u.id === e.userId);
      const h = calcHours(e.startTime, e.endTime);
      const r = getUserRate(users, settings, e.userId);
      const l = calcLabor(h, r);
      const m = calcMaterialsTotal(e.materials);
      lines.push(e.date + ',"' + (u?.name || "") + '","' + e.category + '","' + e.description.replace(/"/g, '""') + '",' + h.toFixed(2) + "," + r.toFixed(2) + "," + l.toFixed(2) + "," + m.toFixed(2) + "," + (l + m).toFixed(2) + "," + e.status);
    });
    if (yrPurchases.length > 0) {
      lines.push("");
      lines.push("═══ ITEMIZED PURCHASE ENTRIES ═══");
      lines.push("Date,Member,Category,Store,Description,Total,Status");
      yrPurchases.sort((a, b) => a.date.localeCompare(b.date)).forEach(e => {
        const u = users.find(u => u.id === e.userId);
        lines.push(e.date + ',"' + (u?.name || "") + '","' + e.category + '","' + (e.storeName || "").replace(/"/g, '""') + '","' + (e.description || "").replace(/"/g, '""') + '",' + (e.total || 0).toFixed(2) + "," + e.status);
      });
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = settings.hoaName.replace(/\s+/g, "_") + "_FiscalYear_" + year + ".csv"; a.click();
  };

  return (
    <div className="fade-in">
      <h2 style={{ ...S.h2, marginBottom: 24 }}>Reports</h2>
      {/* Fiscal Year Export */}
      {isTreasurer && (
        <div style={{ ...S.card, marginBottom: 20, background: "#FAFCFF", borderColor: "#C7D2FE" }}>
          <div style={{ display: "flex", alignItems: mob ? "flex-start" : "center", justifyContent: "space-between", flexDirection: mob ? "column" : "row", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>📊</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: BRAND.navy }}>Fiscal Year Report</span>
              </div>
              <div style={{ fontSize: 13, color: BRAND.textMuted }}>CPA-ready multi-section export: totals by category, member &amp; month. Includes all approved + paid entries. <strong>Tip:</strong> Share this with your accountant at year-end.</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={S.btnSecondary} onClick={() => exportFiscalYear(new Date().getFullYear())}><Icon name="download" size={16} /> {new Date().getFullYear()}</button>
              <button style={{ ...S.btnGhost, fontSize: 13 }} onClick={() => exportFiscalYear(new Date().getFullYear() - 1)}>{new Date().getFullYear() - 1}</button>
            </div>
          </div>
        </div>
      )}
      <div style={S.card}>
        {/* Quick date presets */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: BRAND.textLight, lineHeight: "30px", marginRight: 4 }}>Quick:</span>
          {[
            { label: "This Month", fn: () => { const d = new Date(); setDateFrom(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01"); setDateTo(todayStr()); } },
            { label: "Last Month", fn: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"); setDateFrom(y + "-" + m + "-01"); const end = new Date(y, d.getMonth() + 1, 0); setDateTo(end.toISOString().split("T")[0]); } },
            { label: "This Quarter", fn: () => { const d = new Date(); const q = Math.floor(d.getMonth() / 3) * 3; setDateFrom(d.getFullYear() + "-" + String(q + 1).padStart(2, "0") + "-01"); setDateTo(todayStr()); } },
            { label: "YTD", fn: () => { setDateFrom(new Date().getFullYear() + "-01-01"); setDateTo(todayStr()); } },
            { label: "Last Year", fn: () => { const y = new Date().getFullYear() - 1; setDateFrom(y + "-01-01"); setDateTo(y + "-12-31"); } },
          ].map(p => (
            <button key={p.label} onClick={() => { p.fn(); setGenerated(true); }} style={{ padding: "5px 14px", borderRadius: 14, border: "1px solid " + BRAND.borderLight, background: BRAND.white, color: BRAND.navy, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: BRAND.sans, transition: "all 150ms" }} onMouseEnter={ev => { ev.currentTarget.style.background = BRAND.navy; ev.currentTarget.style.color = "#fff"; }} onMouseLeave={ev => { ev.currentTarget.style.background = BRAND.white; ev.currentTarget.style.color = BRAND.navy; }}>{p.label}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : (isTreasurer ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr"), gap: mob ? 12 : 16, marginBottom: 20 }}>
          <Field label="From"><input type="date" style={S.input} value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></Field>
          <Field label="To"><input type="date" style={S.input} value={dateTo} onChange={e => setDateTo(e.target.value)} /></Field>
          {isTreasurer && <Field label="Member"><select style={S.select} value={filterUser} onChange={e => setFilterUser(e.target.value)}><option value="all">All Members</option>{users.filter(u => u.role === ROLES.MEMBER).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>}
          <Field label="Status"><select style={S.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value={STATUSES.APPROVED}>Approved Only</option><option value={STATUSES.PAID}>Paid Only</option><option value="all">All</option></select></Field>
        </div>
        <button style={S.btnPrimary} onClick={() => setGenerated(true)}><Icon name="chart" size={16} /> Generate Report</button>
      </div>
      {generated && (
        <div className="fade-in">
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: mob ? 8 : 16, marginBottom: 20 }}>
            <StatCard label="Entries" value={filtered.length} icon="file" />
            <StatCard label="Total Hours" value={fmtHours(totals.totalHours)} icon="clock" accentColor="#2563eb" />
            <StatCard label="Labor" value={fmt(totals.totalLabor)} icon="users" accentColor={BRAND.green} />
            <StatCard label="Grand Total" value={fmt(totals.grand)} icon="dollar" accentColor={BRAND.brick} />
          </div>
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div><h3 style={{ ...S.h2, fontSize: 20 }}>{settings.hoaName}</h3><div style={{ fontSize: 13, color: BRAND.textMuted }}>{formatDate(dateFrom)} – {formatDate(dateTo)}</div></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...S.btnPrimary, fontSize: 13 }} onClick={exportPDF}><Icon name="file" size={15} /> Export PDF</button>
                <button style={{ ...S.btnGhost, fontSize: 13 }} onClick={exportCSV}><Icon name="download" size={15} /> CSV</button>
              </div>
            </div>
            {filtered.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: BRAND.textLight }}>No entries found for this period.</div> : (
              <div style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <caption className="sr-only">Work entries report</caption>
                  <thead><tr><th scope="col" style={S.th}>Date</th>{isTreasurer && <th scope="col" style={S.th}>Member</th>}<th scope="col" style={S.th}>Category</th><th scope="col" style={S.th}>Description</th><th scope="col" style={{ ...S.th, textAlign: "right" }}>Hours</th><th scope="col" style={{ ...S.th, textAlign: "right" }}>Total</th></tr></thead>
                  <tbody>{filtered.map((e, i) => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); return (
                    <tr key={e.id} style={{ background: i % 2 === 1 ? BRAND.bgSoft : BRAND.white }}><td style={S.td}>{formatDate(e.date)}</td>{isTreasurer && <td style={S.td}>{u?.name}</td>}<td style={S.td}><CategoryBadge category={e.category} /></td><td style={{ ...S.td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</td><td style={{ ...S.td, textAlign: "right" }}>{h.toFixed(2)}</td><td style={{ ...S.td, textAlign: "right", fontWeight: 700 }}>{fmt(calcLabor(h, r) + calcMaterialsTotal(e.materials))}</td></tr>
                  ); })}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PAGE TRANSITION LOADER
// ═══════════════════════════════════════════════════════════════════════════
