import { useState, useEffect, useMemo } from "react";
import "./dashboard.css";
import { getCustomers, getAllLoans, getLoanPayments } from "../../api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n ?? 0);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");

const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ icon, title, value, sub, accent, trend }) {
    return (
        <div className={`db-metric-card db-metric-card--${accent}`}>
            <div className="db-metric-top">
                <div className={`db-metric-icon db-metric-icon--${accent}`}>{icon}</div>
                {trend !== undefined && (
                    <span className={`db-metric-trend ${trend >= 0 ? "up" : "down"}`}>
                        {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}
                    </span>
                )}
            </div>
            <div className="db-metric-value">{value}</div>
            <div className="db-metric-title">{title}</div>
            {sub && <div className="db-metric-sub">{sub}</div>}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function DashboardOverview({ onNavigateToLoans, onNavigateToSchedule }) {
    const [customers, setCustomers] = useState([]);
    const [loans, setLoans] = useState([]);
    const [todayDues, setTodayDues] = useState([]); // [{payment, loan, customer}]
    const [overdues, setOverdues] = useState([]);   // [{payment, loan, customer}]
    const [loading, setLoading] = useState(true);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [dueSortCol, setDueSortCol] = useState("due_date");
    const [dueSortDir, setDueSortDir] = useState("asc");
    const [overdueSortCol, setOverdueSortCol] = useState("due_date");
    const [overdueSortDir, setOverdueSortDir] = useState("asc");

    const today = new Date();

    // ── Fetch customers + loans ────────────────────────────────────────────────
    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const [custRes, loanRes] = await Promise.all([
                    getCustomers().catch(() => []),
                    getAllLoans().catch(() => []),
                ]);
                const custList = Array.isArray(custRes) ? custRes : custRes?.customers ?? [];
                const loanList = Array.isArray(loanRes) ? loanRes : loanRes?.loans ?? [];
                setCustomers(custList);
                setLoans(loanList);

                // Now fetch payments for all loans to find today's dues & overdues
                await fetchDuePayments(loanList, custList);
            } catch (err) {
                console.error("Dashboard load error:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // ── Fetch all payments and identify today's dues & overdues ───────────────
    const fetchDuePayments = async (loanList, custList) => {
        if (!loanList.length) return;
        try {
            setPaymentsLoading(true);

            // Build a customer lookup map for performance
            const custMap = {};
            custList.forEach((c) => { custMap[c.id] = c; });

            // Fetch payments for all loans in parallel (ignore 404 errors gracefully)
            const results = await Promise.allSettled(
                loanList.map(async (loan) => {
                    try {
                        const res = await getLoanPayments(loan.id);
                        const payments = Array.isArray(res) ? res : res?.payments ?? [];
                        return { loan, payments };
                    } catch {
                        return { loan, payments: [] };
                    }
                })
            );

            const todayRows = [];
            const overdueRows = [];

            results.forEach((result) => {
                if (result.status !== "fulfilled") return;
                const { loan, payments } = result.value;
                const customer = custMap[loan.customer_id] ?? null;

                payments.forEach((payment) => {
                    const isPaid = (payment.payment_status || "").toLowerCase() === "paid";
                    if (isPaid) return; // Skip already paid

                    const dueDate = payment.due_date ? new Date(payment.due_date) : null;
                    if (!dueDate) return;

                    if (isSameDay(dueDate, today)) {
                        todayRows.push({ payment, loan, customer });
                    } else if (dueDate < today) {
                        overdueRows.push({ payment, loan, customer });
                    }
                });
            });

            setTodayDues(todayRows);
            setOverdues(overdueRows);
        } catch (err) {
            console.error("Error fetching due payments:", err);
        } finally {
            setPaymentsLoading(false);
        }
    };

    // ── Computed Metrics ──────────────────────────────────────────────────────
    const metrics = useMemo(() => {
        const activeLoans = loans.filter(
            (l) => ["active", "approved"].includes((l.loan_status || "").toLowerCase())
        );
        const pendingLoans = loans.filter(
            (l) => (l.loan_status || "").toLowerCase() === "pending"
        );
        const closedLoans = loans.filter(
            (l) => (l.loan_status || "").toLowerCase() === "closed"
        );
        const totalPrincipal = loans.reduce(
            (sum, l) => sum + Number(l.principal_amount || 0),
            0
        );
        const activePrincipal = activeLoans.reduce(
            (sum, l) => sum + Number(l.principal_amount || 0),
            0
        );
        const customersWithLoans = new Set(loans.map((l) => l.customer_id)).size;

        return {
            totalCustomers: customers.length,
            customersWithLoans,
            totalLoans: loans.length,
            activeLoans: activeLoans.length,
            pendingLoans: pendingLoans.length,
            closedLoans: closedLoans.length,
            totalPrincipal,
            activePrincipal,
            todayDuesCount: todayDues.length,
            overdueCount: overdues.length,
            todayDuesAmount: todayDues.reduce(
                (sum, r) => sum + Number(r.payment.emi_amount ?? r.payment.amount ?? 0),
                0
            ),
            overdueAmount: overdues.reduce(
                (sum, r) => sum + Number(r.payment.emi_amount ?? r.payment.amount ?? 0),
                0
            ),
        };
    }, [customers, loans, todayDues, overdues]);

    // ── Sortable Rows Helper ──────────────────────────────────────────────────
    const sortRows = (rows, col, dir) => {
        return [...rows].sort((a, b) => {
            let av, bv;
            if (col === "customer_name") {
                av = a.customer?.name?.toLowerCase() ?? "";
                bv = b.customer?.name?.toLowerCase() ?? "";
            } else if (col === "loan_id") {
                av = a.loan.id;
                bv = b.loan.id;
            } else if (col === "due_date") {
                av = new Date(a.payment.due_date);
                bv = new Date(b.payment.due_date);
            } else if (col === "emi_amount") {
                av = Number(a.payment.emi_amount ?? 0);
                bv = Number(b.payment.emi_amount ?? 0);
            } else {
                av = "";
                bv = "";
            }
            if (av < bv) return dir === "asc" ? -1 : 1;
            if (av > bv) return dir === "asc" ? 1 : -1;
            return 0;
        });
    };

    const sortedTodayDues = useMemo(
        () => sortRows(todayDues, dueSortCol, dueSortDir),
        [todayDues, dueSortCol, dueSortDir]
    );

    const sortedOverdues = useMemo(
        () => sortRows(overdues, overdueSortCol, overdueSortDir),
        [overdues, overdueSortCol, overdueSortDir]
    );

    const toggleDueSort = (col) => {
        if (dueSortCol === col) setDueSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setDueSortCol(col); setDueSortDir("asc"); }
    };

    const toggleOverdueSort = (col) => {
        if (overdueSortCol === col) setOverdueSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setOverdueSortCol(col); setOverdueSortDir("asc"); }
    };

    const SortIcon = ({ col, activeCol, dir }) => (
        <span className="db-sort-icon">
            {activeCol === col ? (dir === "asc" ? " ↑" : " ↓") : " ⇅"}
        </span>
    );

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="db-loading-wrap">
                <div className="db-spinner" />
                <span>Loading dashboard data…</span>
            </div>
        );
    }

    return (
        <div className="db-root">

            {/* ══ WELCOME BANNER ══ */}
            <div className="db-welcome">
                <div className="db-welcome-text">
                    <h2 className="db-welcome-title">
                        Good {today.getHours() < 12 ? "Morning" : today.getHours() < 17 ? "Afternoon" : "Evening"}, Administrator 👋
                    </h2>
                    <p className="db-welcome-sub">
                        {today.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        &nbsp;&middot;&nbsp; LoanOS Enterprise Dashboard
                    </p>
                </div>
                <div className="db-welcome-badges">
                    {metrics.todayDuesCount > 0 && (
                        <span className="db-alert-badge db-alert-badge--due">
                            📅 {metrics.todayDuesCount} Due Today
                        </span>
                    )}
                    {metrics.overdueCount > 0 && (
                        <span className="db-alert-badge db-alert-badge--overdue">
                            ⚠️ {metrics.overdueCount} Overdue
                        </span>
                    )}
                </div>
            </div>

            {/* ══ METRICS GRID ══ */}
            <div className="db-metrics-grid">
                <MetricCard
                    icon="👥"
                    title="Total Borrowers"
                    value={metrics.totalCustomers.toLocaleString()}
                    sub={`${metrics.customersWithLoans} with active accounts`}
                    accent="indigo"
                />
                <MetricCard
                    icon="📋"
                    title="Total Loans"
                    value={metrics.totalLoans.toLocaleString()}
                    sub={`${metrics.activeLoans} Active · ${metrics.pendingLoans} Pending`}
                    accent="maroon"
                />
                <MetricCard
                    icon="💰"
                    title="Total Portfolio"
                    value={fmt(metrics.totalPrincipal)}
                    sub={`Active exposure: ${fmt(metrics.activePrincipal)}`}
                    accent="teal"
                />
                <MetricCard
                    icon="✅"
                    title="Active Loans"
                    value={metrics.activeLoans.toLocaleString()}
                    sub={`${metrics.closedLoans} closed loans`}
                    accent="green"
                />
                <MetricCard
                    icon="📅"
                    title="Due Today"
                    value={metrics.todayDuesCount.toLocaleString()}
                    sub={metrics.todayDuesCount > 0 ? `Total: ${fmt(metrics.todayDuesAmount)}` : "No payments due today"}
                    accent={metrics.todayDuesCount > 0 ? "orange" : "neutral"}
                />
                <MetricCard
                    icon="⚠️"
                    title="Overdue Payments"
                    value={metrics.overdueCount.toLocaleString()}
                    sub={metrics.overdueCount > 0 ? `Outstanding: ${fmt(metrics.overdueAmount)}` : "No overdue payments"}
                    accent={metrics.overdueCount > 0 ? "red" : "neutral"}
                />
            </div>

            {/* ══ LOAN STATUS BREAKDOWN ══ */}
            <div className="db-status-bar-wrap">
                <div className="db-section-title">Loan Portfolio Breakdown</div>
                <div className="db-status-bars">
                    {[
                        { label: "Active", count: metrics.activeLoans, color: "#10b981" },
                        { label: "Pending", count: metrics.pendingLoans, color: "#f59e0b" },
                        { label: "Closed", count: metrics.closedLoans, color: "#94a3b8" },
                    ].map((item) => {
                        const pct = metrics.totalLoans > 0
                            ? Math.round((item.count / metrics.totalLoans) * 100)
                            : 0;
                        return (
                            <div key={item.label} className="db-status-bar-item">
                                <div className="db-status-bar-label">
                                    <span style={{ color: item.color }}>●</span>
                                    {item.label}
                                    <span className="db-status-bar-count">{item.count}</span>
                                </div>
                                <div className="db-status-bar-track">
                                    <div
                                        className="db-status-bar-fill"
                                        style={{ width: `${pct}%`, background: item.color }}
                                    />
                                </div>
                                <span className="db-status-bar-pct">{pct}%</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ══ TODAY'S DUE TABLE ══ */}
            <div className="db-table-card">
                <div className="db-table-card-header">
                    <div className="db-table-card-title-wrap">
                        <span className="db-table-card-icon">📅</span>
                        <div>
                            <h3 className="db-table-card-title">Today's Due Payments</h3>
                            <p className="db-table-card-sub">
                                {fmtDate(today)} &middot; {metrics.todayDuesCount} installment{metrics.todayDuesCount !== 1 ? "s" : ""} due today
                            </p>
                        </div>
                    </div>
                    <span className="db-count-badge db-count-badge--due">
                        {metrics.todayDuesCount} Due
                    </span>
                </div>

                {paymentsLoading ? (
                    <div className="db-table-loading">
                        <div className="db-spinner db-spinner--sm" />
                        <span>Fetching today's due payments from all loans…</span>
                    </div>
                ) : sortedTodayDues.length === 0 ? (
                    <div className="db-empty-state db-empty-state--good">
                        <span className="db-empty-icon">🎉</span>
                        <h4>No Payments Due Today</h4>
                        <p>All installments for today are either paid or not yet scheduled.</p>
                    </div>
                ) : (
                    <div className="db-table-scroll">
                        <table className="db-table">
                            <thead>
                                <tr>
                                    <th onClick={() => toggleDueSort("customer_name")} className="db-th-sortable">
                                        Borrower <SortIcon col="customer_name" activeCol={dueSortCol} dir={dueSortDir} />
                                    </th>
                                    <th onClick={() => toggleDueSort("loan_id")} className="db-th-sortable">
                                        Loan ID <SortIcon col="loan_id" activeCol={dueSortCol} dir={dueSortDir} />
                                    </th>
                                    <th>Loan Type</th>
                                    <th onClick={() => toggleDueSort("emi_amount")} className="db-th-sortable">
                                        EMI Amount <SortIcon col="emi_amount" activeCol={dueSortCol} dir={dueSortDir} />
                                    </th>
                                    <th>Principal Part</th>
                                    <th>Interest Part</th>
                                    <th onClick={() => toggleDueSort("due_date")} className="db-th-sortable">
                                        Due Date <SortIcon col="due_date" activeCol={dueSortCol} dir={dueSortDir} />
                                    </th>
                                    <th>Inst. #</th>
                                    <th style={{ textAlign: "center" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTodayDues.map((row, idx) => (
                                    <tr key={`due-${row.payment.payment_id}-${idx}`}>
                                        <td>
                                            <div className="db-customer-cell">
                                                <div className="db-customer-avatar">
                                                    {(row.customer?.name || "?")[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="db-customer-name">{row.customer?.name ?? "—"}</div>
                                                    <div className="db-customer-sub">
                                                        {row.customer?.phone || row.customer?.email || `ID #${row.loan.customer_id}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="db-mono">#{row.loan.id}</td>
                                        <td>
                                            <span className="db-type-pill">{row.loan.loan_type}</span>
                                        </td>
                                        <td className="db-amount db-amount--due">
                                            {fmt(row.payment.emi_amount ?? row.payment.amount)}
                                        </td>
                                        <td className="db-amount">{fmt(row.payment.principal_amount)}</td>
                                        <td className="db-amount">{fmt(row.payment.interest_amount)}</td>
                                        <td className="db-date">
                                            <span className="db-due-today-tag">Today</span>
                                            {fmtDate(row.payment.due_date)}
                                        </td>
                                        <td className="db-mono">#{row.payment.payment_number}</td>
                                        <td style={{ textAlign: "center" }}>
                                            <div className="db-action-group">
                                                {onNavigateToSchedule && (
                                                    <button
                                                        className="db-action-btn db-action-btn--schedule"
                                                        onClick={() => onNavigateToSchedule(row.loan, row.customer)}
                                                        title="Open Payment Schedule"
                                                    >
                                                        Schedule ›
                                                    </button>
                                                )}
                                                {onNavigateToLoans && (
                                                    <button
                                                        className="db-action-btn db-action-btn--loan"
                                                        onClick={() => onNavigateToLoans(row.customer)}
                                                        title="View Loan Details"
                                                    >
                                                        Loan Details
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ══ OVERDUE TABLE ══ */}
            <div className="db-table-card db-table-card--overdue">
                <div className="db-table-card-header">
                    <div className="db-table-card-title-wrap">
                        <span className="db-table-card-icon">⚠️</span>
                        <div>
                            <h3 className="db-table-card-title">Overdue Payments</h3>
                            <p className="db-table-card-sub">
                                Installments past their due date — action required
                            </p>
                        </div>
                    </div>
                    {metrics.overdueCount > 0 && (
                        <span className="db-count-badge db-count-badge--overdue">
                            {metrics.overdueCount} Overdue
                        </span>
                    )}
                </div>

                {paymentsLoading ? (
                    <div className="db-table-loading">
                        <div className="db-spinner db-spinner--sm" />
                        <span>Scanning overdue records…</span>
                    </div>
                ) : sortedOverdues.length === 0 ? (
                    <div className="db-empty-state db-empty-state--good">
                        <span className="db-empty-icon">✅</span>
                        <h4>No Overdue Payments</h4>
                        <p>Great news — all tracked installments are on schedule.</p>
                    </div>
                ) : (
                    <div className="db-table-scroll">
                        <table className="db-table db-table--overdue">
                            <thead>
                                <tr>
                                    <th onClick={() => toggleOverdueSort("customer_name")} className="db-th-sortable">
                                        Borrower <SortIcon col="customer_name" activeCol={overdueSortCol} dir={overdueSortDir} />
                                    </th>
                                    <th onClick={() => toggleOverdueSort("loan_id")} className="db-th-sortable">
                                        Loan ID <SortIcon col="loan_id" activeCol={overdueSortCol} dir={overdueSortDir} />
                                    </th>
                                    <th>Loan Type</th>
                                    <th onClick={() => toggleOverdueSort("emi_amount")} className="db-th-sortable">
                                        EMI Amount <SortIcon col="emi_amount" activeCol={overdueSortCol} dir={overdueSortDir} />
                                    </th>
                                    <th onClick={() => toggleOverdueSort("due_date")} className="db-th-sortable">
                                        Due Date <SortIcon col="due_date" activeCol={overdueSortCol} dir={overdueSortDir} />
                                    </th>
                                    <th>Days Overdue</th>
                                    <th>Inst. #</th>
                                    <th style={{ textAlign: "center" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedOverdues.map((row, idx) => {
                                    const dueDate = new Date(row.payment.due_date);
                                    const daysOverdue = Math.floor(
                                        (today - dueDate) / (1000 * 60 * 60 * 24)
                                    );
                                    return (
                                        <tr key={`ov-${row.payment.payment_id}-${idx}`} className="db-row-overdue">
                                            <td>
                                                <div className="db-customer-cell">
                                                    <div className="db-customer-avatar db-customer-avatar--red">
                                                        {(row.customer?.name || "?")[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="db-customer-name">{row.customer?.name ?? "—"}</div>
                                                        <div className="db-customer-sub">
                                                            {row.customer?.phone || row.customer?.email || `ID #${row.loan.customer_id}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="db-mono">#{row.loan.id}</td>
                                            <td>
                                                <span className="db-type-pill">{row.loan.loan_type}</span>
                                            </td>
                                            <td className="db-amount db-amount--overdue">
                                                {fmt(row.payment.emi_amount ?? row.payment.amount)}
                                            </td>
                                            <td className="db-date db-date--overdue">
                                                {fmtDate(row.payment.due_date)}
                                            </td>
                                            <td>
                                                <span className={`db-days-overdue ${daysOverdue > 30 ? "critical" : daysOverdue > 7 ? "warning" : ""}`}>
                                                    {daysOverdue}d overdue
                                                </span>
                                            </td>
                                            <td className="db-mono">#{row.payment.payment_number}</td>
                                            <td style={{ textAlign: "center" }}>
                                                <div className="db-action-group">
                                                    {onNavigateToSchedule && (
                                                        <button
                                                            className="db-action-btn db-action-btn--schedule"
                                                            onClick={() => onNavigateToSchedule(row.loan, row.customer)}
                                                            title="Open Payment Schedule"
                                                        >
                                                            Schedule ›
                                                        </button>
                                                    )}
                                                    {onNavigateToLoans && (
                                                        <button
                                                            className="db-action-btn db-action-btn--loan"
                                                            onClick={() => onNavigateToLoans(row.customer)}
                                                            title="View Loan Details"
                                                        >
                                                            Loan Details
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
}
