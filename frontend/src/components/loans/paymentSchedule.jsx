import { useState, useEffect, useMemo } from "react";
import "./paymentSchedule.css";
import {
    getCustomers,
    getAllLoans,
    createLoanSchedule,
    getLoanPayments,
    updatePaymentStatus,
} from "../../api";

const STATUS_COLORS = {
    paid: { bg: "#d1fae5", text: "#065f46" },
    pending: { bg: "#fef3c7", text: "#92400e" },
    overdue: { bg: "#fee2e2", text: "#991b1b" },
};

const fmt = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");

export default function PaymentSchedule({
    preselectedCustomer,
    preselectedLoan,
    onNavigateToLoans,
}) {
    // ── Data States ────────────────────────────────────────────────────────────
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(preselectedCustomer || null);
    const [allLoans, setAllLoans] = useState([]);
    const [selectedLoan, setSelectedLoan] = useState(preselectedLoan || null);
    const [payments, setPayments] = useState([]);

    // ── Loading & UI States ───────────────────────────────────────────────────
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [generatingSchedule, setGeneratingSchedule] = useState(false);
    const [updatingPaymentId, setUpdatingPaymentId] = useState(null);
    const [toast, setToast] = useState(null);

    // ── Filter & Search States ────────────────────────────────────────────────
    const [customerSearch, setCustomerSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // all | pending | paid | overdue
    const [tableSearch, setTableSearch] = useState("");

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3800);
    };

    // ── 1. Fetch Customers & Loans on mount ────────────────────────────────────
    useEffect(() => {
        async function fetchInitial() {
            try {
                setLoadingCustomers(true);
                const [custRes, loansRes] = await Promise.all([
                    getCustomers().catch(() => []),
                    getAllLoans().catch(() => []),
                ]);

                const custList = Array.isArray(custRes) ? custRes : custRes?.customers ?? [];
                const loanList = Array.isArray(loansRes) ? loansRes : loansRes?.loans ?? [];

                setCustomers(custList);
                setAllLoans(loanList);

                // If no preselected customer, pick first customer with loans (or first customer)
                let activeCust = preselectedCustomer;
                if (!activeCust && custList.length > 0) {
                    const withLoans = custList.find((c) =>
                        loanList.some((l) => Number(l.customer_id) === Number(c.id))
                    );
                    activeCust = withLoans || custList[0];
                }
                setSelectedCustomer(activeCust || null);

                // If preselected loan was provided, keep it; otherwise pick first loan for active customer
                if (preselectedLoan) {
                    setSelectedLoan(preselectedLoan);
                } else if (activeCust) {
                    const custLoans = loanList.filter((l) => Number(l.customer_id) === Number(activeCust.id));
                    if (custLoans.length > 0) {
                        setSelectedLoan(custLoans[0]);
                    }
                }
            } catch (err) {
                console.error("PaymentSchedule mount error:", err);
                showToast("Failed to load initial data.", "error");
            } finally {
                setLoadingCustomers(false);
            }
        }
        fetchInitial();
    }, [preselectedCustomer, preselectedLoan]);

    // ── 2. Loans for current selected customer ────────────────────────────────
    const currentCustomerLoans = useMemo(() => {
        if (!selectedCustomer) return [];
        return allLoans.filter((l) => Number(l.customer_id) === Number(selectedCustomer.id));
    }, [allLoans, selectedCustomer]);

    // Ensure selectedLoan belongs to selectedCustomer
    useEffect(() => {
        if (!selectedCustomer) {
            setSelectedLoan(null);
            setPayments([]);
            return;
        }
        if (currentCustomerLoans.length > 0) {
            const matches = currentCustomerLoans.find((l) => l.id === selectedLoan?.id);
            if (!matches) {
                setSelectedLoan(currentCustomerLoans[0]);
            }
        } else {
            setSelectedLoan(null);
            setPayments([]);
        }
    }, [selectedCustomer, currentCustomerLoans]);

    // ── 3. Fetch Payments when selectedLoan changes ───────────────────────────
    const fetchPaymentsForLoan = async (loanId) => {
        if (!loanId) {
            setPayments([]);
            return;
        }
        try {
            setLoadingPayments(true);
            const res = await getLoanPayments(loanId);
            const list = Array.isArray(res) ? res : res?.payments ?? [];
            setPayments(list);
        } catch (err) {
            // If 404 with "No payments found", schedule just isn't created yet
            if (err?.response?.status === 404) {
                setPayments([]);
            } else {
                console.error("Error fetching payments:", err);
                setPayments([]);
            }
        } finally {
            setLoadingPayments(false);
        }
    };

    useEffect(() => {
        if (selectedLoan?.id) {
            fetchPaymentsForLoan(selectedLoan.id);
        } else {
            setPayments([]);
        }
    }, [selectedLoan]);

    // ── 4. Generate Schedule ──────────────────────────────────────────────────
    const handleGenerateSchedule = async () => {
        if (!selectedLoan) return;
        try {
            setGeneratingSchedule(true);
            await createLoanSchedule(selectedLoan.id);
            showToast(`Installment schedule generated for Loan #${selectedLoan.id}!`, "success");
            await fetchPaymentsForLoan(selectedLoan.id);
        } catch (err) {
            console.error("Generate schedule error:", err);
            const detail = err?.response?.data?.detail;
            showToast(typeof detail === "string" ? detail : "Failed to generate schedule.", "error");
        } finally {
            setGeneratingSchedule(false);
        }
    };

    // ── 5. Toggle Payment Status (Paid / Pending) ─────────────────────────────
    const handleTogglePaymentStatus = async (payment) => {
        if (!selectedCustomer || !selectedLoan) return;
        const currentStatus = (payment.payment_status || "pending").toLowerCase();
        const nextStatus = currentStatus === "paid" ? "pending" : "paid";
        const todayDate = nextStatus === "paid" ? new Date().toISOString() : null;

        try {
            setUpdatingPaymentId(payment.payment_id);
            await updatePaymentStatus(
                payment.payment_id,
                selectedCustomer.id,
                selectedLoan.id,
                nextStatus,
                todayDate
            );

            showToast(
                `Payment #${payment.payment_number} marked as ${nextStatus.toUpperCase()}!`,
                "success"
            );

            // Optimistically update local state for instantaneous responsiveness
            setPayments((prev) =>
                prev.map((p) =>
                    p.payment_id === payment.payment_id
                        ? { ...p, payment_status: nextStatus, paid_date: todayDate }
                        : p
                )
            );
        } catch (err) {
            console.error("Toggle payment status error:", err);
            const detail = err?.response?.data?.detail;
            showToast(typeof detail === "string" ? detail : "Failed to update payment status.", "error");
        } finally {
            setUpdatingPaymentId(null);
        }
    };

    // ── 6. Metrics Calculations ───────────────────────────────────────────────
    const metrics = useMemo(() => {
        if (!payments || payments.length === 0) {
            return {
                totalScheduled: 0,
                totalPaid: 0,
                remaining: 0,
                paidCount: 0,
                totalCount: 0,
                percentPaid: 0,
                overdueCount: 0,
                nextDue: null,
            };
        }

        const now = new Date();
        let totalScheduled = 0;
        let totalPaid = 0;
        let paidCount = 0;
        let overdueCount = 0;
        let nextDue = null;

        payments.forEach((p) => {
            const amt = Number(p.emi_amount ?? p.amount ?? 0);
            totalScheduled += amt;

            const isPaid = (p.payment_status || "").toLowerCase() === "paid";
            if (isPaid) {
                totalPaid += amt;
                paidCount++;
            } else {
                const dueDate = p.due_date ? new Date(p.due_date) : null;
                if (dueDate && dueDate < now) {
                    overdueCount++;
                }
                if (dueDate && (!nextDue || dueDate < nextDue)) {
                    nextDue = dueDate;
                }
            }
        });

        const remaining = Math.max(0, totalScheduled - totalPaid);
        const percentPaid = totalScheduled > 0 ? Math.round((totalPaid / totalScheduled) * 100) : 0;

        return {
            totalScheduled,
            totalPaid,
            remaining,
            paidCount,
            totalCount: payments.length,
            percentPaid,
            overdueCount,
            nextDue,
        };
    }, [payments]);

    // ── 7. Filtered Table Rows ────────────────────────────────────────────────
    const filteredPayments = useMemo(() => {
        const now = new Date();
        return payments.filter((p) => {
            const status = (p.payment_status || "pending").toLowerCase();
            const dueDate = p.due_date ? new Date(p.due_date) : null;
            const isOverdue = status !== "paid" && dueDate && dueDate < now;

            // Status Filter Tab
            if (statusFilter === "paid" && status !== "paid") return false;
            if (statusFilter === "pending" && status !== "pending") return false;
            if (statusFilter === "overdue" && !isOverdue) return false;

            // Table Search
            if (tableSearch.trim()) {
                const q = tableSearch.toLowerCase().trim();
                const matchNum = String(p.payment_number || "").includes(q);
                const matchAmt = String(p.emi_amount || "").includes(q);
                const matchDate = fmtDate(p.due_date).toLowerCase().includes(q);
                if (!matchNum && !matchAmt && !matchDate) return false;
            }

            return true;
        });
    }, [payments, statusFilter, tableSearch]);

    console.log("filteredPayments", filteredPayments);

    // ── Filtered Borrowers List (Left Column) ─────────────────────────────────
    const filteredCustomers = useMemo(() => {
        const q = customerSearch.toLowerCase().trim();
        if (!q) return customers;
        return customers.filter(
            (c) =>
                (c.name || "").toLowerCase().includes(q) ||
                (c.phone || "").toLowerCase().includes(q) ||
                (c.email || "").toLowerCase().includes(q) ||
                String(c.id || "").includes(q)
        );
    }, [customers, customerSearch]);

    return (
        <div className="ps-root">
            {/* Toast */}
            {toast && (
                <div className={`ps-toast ps-toast--${toast.type}`}>
                    <span>{toast.type === "success" ? "✓" : "✕"}</span>
                    <span>{toast.message}</span>
                </div>
            )}

            {/* ══════════════════════════════════════════
                LEFT PANEL: BORROWERS DIRECTORY
            ══════════════════════════════════════════ */}
            <aside className="ps-borrowers-panel">
                <div className="ps-panel-header">
                    <div className="ps-panel-title-wrap">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        <h2 className="ps-panel-title">Borrowers</h2>
                    </div>
                    <span className="ps-badge">{customers.length}</span>
                </div>

                <div className="ps-search-wrap">
                    <svg className="ps-search-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    <input
                        type="text"
                        className="ps-search-input"
                        placeholder="Search borrower…"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                </div>

                {loadingCustomers ? (
                    <div className="ps-loader-wrap">
                        <div className="ps-spinner" />
                        <span>Loading borrowers…</span>
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="ps-empty-list">No borrowers match search.</div>
                ) : (
                    <ul className="ps-borrower-list">
                        {filteredCustomers.map((c) => {
                            const cLoans = allLoans.filter((l) => Number(l.customer_id) === Number(c.id));
                            const isSelected = selectedCustomer?.id === c.id;
                            return (
                                <li
                                    key={c.id}
                                    className={`ps-borrower-item ${isSelected ? "active" : ""}`}
                                    onClick={() => setSelectedCustomer(c)}
                                >
                                    <div className="ps-avatar">{(c.name || "?")[0].toUpperCase()}</div>
                                    <div className="ps-borrower-meta">
                                        <span className="ps-borrower-name">{c.name || "—"}</span>
                                        <span className="ps-borrower-sub">
                                            {c.phone || c.email || `ID #${c.id}`}
                                        </span>
                                    </div>
                                    <span
                                        className={`ps-loan-count-tag ${cLoans.length > 0 ? "has-loans" : "no-loans"}`}
                                        title={`${cLoans.length} active loans`}
                                    >
                                        {cLoans.length} {cLoans.length === 1 ? "loan" : "loans"}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </aside>

            {/* ══════════════════════════════════════════
                RIGHT PANEL: PAYMENT SCHEDULE VIEW
            ══════════════════════════════════════════ */}
            <main className="ps-main-panel">
                {!selectedCustomer ? (
                    <div className="ps-placeholder">
                        <svg viewBox="0 0 64 64" fill="none" width="60" height="60">
                            <rect x="8" y="10" width="48" height="44" rx="6" stroke="currentColor" strokeWidth="2.5" opacity=".25" />
                            <path d="M18 24h28M18 34h20M18 44h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".35" />
                        </svg>
                        <p>Select a borrower from the left panel to inspect their payment schedule.</p>
                    </div>
                ) : (
                    <>
                        {/* ── Header Banner ── */}
                        <div className="ps-customer-banner">
                            <div className="ps-cust-avatar-lg">
                                {(selectedCustomer.name || "?")[0].toUpperCase()}
                            </div>
                            <div className="ps-cust-header-info">
                                <h2 className="ps-cust-name">{selectedCustomer.name}</h2>
                                <div className="ps-cust-chips">
                                    <span className="ps-chip">🆔 Cust #{selectedCustomer.id}</span>
                                    {selectedCustomer.phone && <span className="ps-chip">📞 {selectedCustomer.phone}</span>}
                                    {selectedCustomer.email && <span className="ps-chip">📧 {selectedCustomer.email}</span>}
                                    {selectedCustomer.pan_number && <span className="ps-chip">🪪 PAN: {selectedCustomer.pan_number}</span>}
                                </div>
                            </div>

                            {onNavigateToLoans && (
                                <button
                                    className="ps-btn ps-btn--ghost ps-btn--sm ps-ml-auto"
                                    onClick={() => onNavigateToLoans(selectedCustomer)}
                                    title="Switch to Loan Details"
                                >
                                    View Loan Details ↗
                                </button>
                            )}
                        </div>

                        {/* ── Multi-Loan Selector Pills ── */}
                        {currentCustomerLoans.length === 0 ? (
                            <div className="ps-no-loans-box">
                                <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
                                    <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" opacity=".25" />
                                    <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".4" />
                                </svg>
                                <div>
                                    <h4>No Active Loans Found</h4>
                                    <p>This borrower does not have any loan registered yet.</p>
                                </div>
                                {onNavigateToLoans && (
                                    <button
                                        className="ps-btn ps-btn--primary ps-btn--sm"
                                        onClick={() => onNavigateToLoans(selectedCustomer)}
                                    >
                                        + Create Loan in Loan Details
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="ps-loans-selector-bar">
                                    <span className="ps-selector-label">Select Loan:</span>
                                    <div className="ps-loan-pills">
                                        {currentCustomerLoans.map((l) => {
                                            const isSelected = selectedLoan?.id === l.id;
                                            return (
                                                <button
                                                    key={l.id}
                                                    className={`ps-loan-pill ${isSelected ? "active" : ""}`}
                                                    onClick={() => setSelectedLoan(l)}
                                                >
                                                    <span className="ps-pill-id">#{l.id}</span>
                                                    <span className="ps-pill-amt">{fmt(l.principal_amount)}</span>
                                                    <span className="ps-pill-type">{l.loan_type}</span>
                                                    <span className={`ps-pill-status ps-pill-status--${(l.loan_status || "pending").toLowerCase()}`}>
                                                        {l.loan_status || "pending"}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {selectedLoan && (
                                    <>
                                        {/* ── Metrics Cards Grid ── */}
                                        <div className="ps-kpi-grid">
                                            <div className="ps-kpi-card">
                                                <span className="ps-kpi-title">Principal Amount</span>
                                                <span className="ps-kpi-value">{fmt(selectedLoan.principal_amount)}</span>
                                                <span className="ps-kpi-sub">
                                                    Rate: {selectedLoan.interest_rate}% p.a. &middot; {selectedLoan.loan_term} {selectedLoan.loan_type}
                                                </span>
                                            </div>

                                            <div className="ps-kpi-card ps-kpi--paid">
                                                <span className="ps-kpi-title">Total Repaid</span>
                                                <span className="ps-kpi-value">{fmt(metrics.totalPaid)}</span>
                                                <div className="ps-kpi-progress">
                                                    <div
                                                        className="ps-kpi-progress-bar"
                                                        style={{ width: `${metrics.percentPaid}%` }}
                                                    />
                                                </div>
                                                <span className="ps-kpi-sub">
                                                    {metrics.paidCount} of {metrics.totalCount} installments paid ({metrics.percentPaid}%)
                                                </span>
                                            </div>

                                            <div className="ps-kpi-card ps-kpi--remaining">
                                                <span className="ps-kpi-title">Remaining Balance</span>
                                                <span className="ps-kpi-value">{fmt(metrics.remaining)}</span>
                                                <span className="ps-kpi-sub">
                                                    {metrics.totalCount - metrics.paidCount} unpaid installments
                                                </span>
                                            </div>

                                            <div className="ps-kpi-card">
                                                <span className="ps-kpi-title">Next Due / Status</span>
                                                <span className="ps-kpi-value">
                                                    {metrics.nextDue ? fmtDate(metrics.nextDue) : "All Cleared ✓"}
                                                </span>
                                                <span className="ps-kpi-sub">
                                                    {metrics.overdueCount > 0 ? (
                                                        <strong className="ps-text-danger">⚠️ {metrics.overdueCount} Overdue</strong>
                                                    ) : (
                                                        <span className="ps-text-success">On Schedule</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {/* ── Payment Schedule Table Section ── */}
                                        <div className="ps-table-container">
                                            <div className="ps-table-header-row">
                                                <div className="ps-filters-group">
                                                    <button
                                                        className={`ps-filter-btn ${statusFilter === "all" ? "active" : ""}`}
                                                        onClick={() => setStatusFilter("all")}
                                                    >
                                                        All ({payments.length})
                                                    </button>
                                                    <button
                                                        className={`ps-filter-btn ${statusFilter === "pending" ? "active" : ""}`}
                                                        onClick={() => setStatusFilter("pending")}
                                                    >
                                                        Pending ({payments.filter((p) => p.payment_status === "pending").length})
                                                    </button>
                                                    <button
                                                        className={`ps-filter-btn ${statusFilter === "paid" ? "active" : ""}`}
                                                        onClick={() => setStatusFilter("paid")}
                                                    >
                                                        Paid ({payments.filter((p) => p.payment_status === "paid").length})
                                                    </button>
                                                    <button
                                                        className={`ps-filter-btn ${statusFilter === "overdue" ? "active" : ""}`}
                                                        onClick={() => setStatusFilter("overdue")}
                                                    >
                                                        Overdue ({metrics.overdueCount})
                                                    </button>
                                                </div>

                                                <div className="ps-table-tools">
                                                    <input
                                                        type="text"
                                                        className="ps-table-search"
                                                        placeholder="Search schedule…"
                                                        value={tableSearch}
                                                        onChange={(e) => setTableSearch(e.target.value)}
                                                    />
                                                    <button
                                                        className="ps-btn ps-btn--outline ps-btn--xs"
                                                        onClick={() => fetchPaymentsForLoan(selectedLoan.id)}
                                                        title="Refresh schedule"
                                                    >
                                                        ↻ Refresh
                                                    </button>
                                                </div>
                                            </div>

                                            {loadingPayments ? (
                                                <div className="ps-loader-wrap ps-mt">
                                                    <div className="ps-spinner" />
                                                    <span>Loading payment installments…</span>
                                                </div>
                                            ) : payments.length === 0 ? (
                                                <div className="ps-empty-schedule">
                                                    <div className="ps-empty-icon">📅</div>
                                                    <h3>No Schedule Generated Yet</h3>
                                                    <p>
                                                        Loan #{selectedLoan.id} is registered, but its repayment installment schedule has not been generated.
                                                    </p>
                                                    <button
                                                        className="ps-btn ps-btn--primary ps-btn--md ps-mt"
                                                        onClick={handleGenerateSchedule}
                                                        disabled={generatingSchedule}
                                                    >
                                                        {generatingSchedule ? "Generating Schedule…" : "⚡ Generate Repayment Schedule"}
                                                    </button>
                                                </div>
                                            ) : filteredPayments.length === 0 ? (
                                                <div className="ps-empty-schedule">
                                                    <p>No installments match the selected filter or search.</p>
                                                    <button
                                                        className="ps-btn ps-btn--ghost ps-btn--xs ps-mt"
                                                        onClick={() => {
                                                            setStatusFilter("all");
                                                            setTableSearch("");
                                                        }}
                                                    >
                                                        Clear Filters
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="ps-table-scroll">
                                                    <table className="ps-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Installments</th>
                                                                <th># payment ID</th>
                                                                <th>Due Date</th>
                                                                <th>EMI Installment</th>
                                                                <th>Principal</th>
                                                                <th>Interest</th>
                                                                <th>Paid Date</th>
                                                                <th>Status</th>
                                                                <th style={{ textAlign: "center" }}>Quick Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredPayments.map((p) => {
                                                                const status = (p.payment_status || "pending").toLowerCase();
                                                                const dueDate = p.due_date ? new Date(p.due_date) : null;
                                                                const isOverdue = status !== "paid" && dueDate && dueDate < new Date();
                                                                const color = STATUS_COLORS[isOverdue ? "overdue" : status] ?? STATUS_COLORS.pending;
                                                                const isUpdating = updatingPaymentId === p.payment_id;

                                                                return (
                                                                    <tr key={p.payment_id} className={isOverdue ? "ps-row-overdue" : ""}>
                                                                        <td>{p.payment_number}</td>
                                                                        <td className="ps-td-mono">#{p.payment_id}</td>
                                                                        <td className={isOverdue ? "ps-due-overdue" : ""}>
                                                                            {fmtDate(p.due_date)}
                                                                            {isOverdue && <span className="ps-overdue-tag">Overdue</span>}
                                                                        </td>
                                                                        <td className="ps-td-money ps-emi-cell">{fmt(p.emi_amount ?? p.amount)}</td>
                                                                        <td>{fmt(p.principal_amount)}</td>
                                                                        <td>{fmt(p.interest_amount)}</td>
                                                                        <td>
                                                                            {p.paid_date ? (
                                                                                <span className="ps-text-success">{fmtDate(p.paid_date)}</span>
                                                                            ) : (
                                                                                <span className="ps-muted">—</span>
                                                                            )}
                                                                        </td>
                                                                        <td>
                                                                            <span
                                                                                className="ps-status-badge"
                                                                                style={{ background: color.bg, color: color.text }}
                                                                            >
                                                                                {isOverdue ? "overdue" : p.payment_status || "pending"}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ textAlign: "center" }}>
                                                                            <button
                                                                                className={`ps-action-btn ${status === "paid" ? "ps-action-btn--pending" : "ps-action-btn--pay"
                                                                                    }`}
                                                                                onClick={() => handleTogglePaymentStatus(p)}
                                                                                disabled={isUpdating}
                                                                                title={status === "paid" ? "Click to revert to pending" : "Click to mark as paid"}
                                                                            >
                                                                                {isUpdating ? (
                                                                                    "Updating…"
                                                                                ) : status === "paid" ? (
                                                                                    "↺ Mark Pending"
                                                                                ) : (
                                                                                    "✓ Mark Paid"
                                                                                )}
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
