import { useState, useEffect, useMemo } from "react";
import "./createLoanForCustomer.css";
import {
    getCustomers,
    applyLoan,
    getAllLoans,
    updateLoan,
    deleteLoan,
    createLoanSchedule,
    getLoanPayments,
    updatePaymentStatus,
} from "../../api";

// ─── Constants & Helpers ──────────────────────────────────────────────────────
const STATUS_COLORS = {
    active: { bg: "#d1fae5", text: "#065f46" },
    pending: { bg: "#fef3c7", text: "#92400e" },
    paid: { bg: "#dbeafe", text: "#1e40af" },
    overdue: { bg: "#fee2e2", text: "#991b1b" },
    closed: { bg: "#f3f4f6", text: "#374151" },
    approved: { bg: "#d1fae5", text: "#065f46" },
    rejected: { bg: "#fee2e2", text: "#991b1b" },
};

const PAY_STATUS_COLORS = {
    paid: { bg: "#d1fae5", text: "#065f46" },
    pending: { bg: "#fef3c7", text: "#92400e" },
    overdue: { bg: "#fee2e2", text: "#991b1b" },
};

const fmt = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");

const EMPTY_FORM = {
    loan_type: "monthly",
    principal_amount: "",
    interest_rate: "",
    loan_term: "",
    start_date: new Date().toISOString().split("T")[0],
    status: "pending",
};

// Calculate EMI helper based on frequency
function calculateEMIValue(principal, annualRate, term, type = "monthly") {
    const p = Number(principal);
    const rAnnual = Number(annualRate);
    const n = Number(term);
    if (!p || !rAnnual || !n) return null;

    let periodRate;
    if (type === "weekly") periodRate = (rAnnual / 100) / 52;
    else if (type === "yearly") periodRate = (rAnnual / 100);
    else periodRate = (rAnnual / 100) / 12; // monthly / default

    const emi = (p * periodRate * Math.pow(1 + periodRate, n)) / (Math.pow(1 + periodRate, n) - 1);
    return isFinite(emi) && emi > 0 ? emi : null;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function CreateLoanForCustomers({
    onNavigateToSchedule,
    preselectedCustomer,
}) {
    // ── Data states ───────────────────────────────────────────────────────────
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(preselectedCustomer || null);
    const [allLoans, setAllLoans] = useState([]);

    // ── View & Loading states ─────────────────────────────────────────────────
    const [view, setView] = useState("list"); // "list" | "create"
    const [loading, setLoading] = useState(false);
    const [loansLoading, setLoansLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [loanSearchTerm, setLoanSearchTerm] = useState("");

    // ── Form State (Create) ───────────────────────────────────────────────────
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    // ── Modals State (View / Edit / Delete) ────────────────────────────────────
    const [viewModalLoan, setViewModalLoan] = useState(null);
    const [viewModalPayments, setViewModalPayments] = useState([]);
    const [viewModalPaymentsLoading, setViewModalPaymentsLoading] = useState(false);

    const [editModalLoan, setEditModalLoan] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editErrors, setEditErrors] = useState({});

    const [deleteModalLoan, setDeleteModalLoan] = useState(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);

    // ── Toast Helper ──────────────────────────────────────────────────────────
    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3800);
    };

    // ── Fetch Customers & All Loans on Mount ───────────────────────────────────
    const loadData = async () => {
        try {
            setLoading(true);
            const [custRes, loansRes] = await Promise.all([
                getCustomers(),
                getAllLoans().catch(() => []),
            ]);
            const custList = Array.isArray(custRes) ? custRes : custRes?.customers ?? [];
            setCustomers(custList);
            setAllLoans(Array.isArray(loansRes) ? loansRes : loansRes?.loans ?? []);
            if (preselectedCustomer) {
                const match = custList.find((c) => Number(c.id) === Number(preselectedCustomer.id));
                setSelectedCustomer(match || preselectedCustomer);
            } else if (custList.length > 0 && !selectedCustomer) {
                setSelectedCustomer(custList[0]);
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to load initial data.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (preselectedCustomer) {
            setSelectedCustomer(preselectedCustomer);
        }
    }, [preselectedCustomer]);

    // ── Refresh Loans Only ────────────────────────────────────────────────────
    const refreshLoans = async () => {
        try {
            setLoansLoading(true);
            const loansRes = await getAllLoans();
            setAllLoans(Array.isArray(loansRes) ? loansRes : loansRes?.loans ?? []);
        } catch (err) {
            console.error("Error fetching loans:", err);
            showToast("Failed to refresh loans.", "error");
        } finally {
            setLoansLoading(false);
        }
    };

    // ── Filtered Customers (Left Sidebar) ──────────────────────────────────────
    const filteredCustomers = useMemo(() => {
        const q = searchTerm.toLowerCase().trim();
        if (!q) return customers;
        return customers.filter((c) =>
            (c.name || "").toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q) ||
            (c.phone || "").toLowerCase().includes(q) ||
            String(c.id || "").includes(q)
        );
    }, [customers, searchTerm]);

    // ── Customer's Loans ──────────────────────────────────────────────────────
    const customerLoans = useMemo(() => {
        if (!selectedCustomer) return [];
        return allLoans.filter((l) => Number(l.customer_id) === Number(selectedCustomer.id));
    }, [allLoans, selectedCustomer]);

    // ── Filtered Customer's Loans (Table search) ──────────────────────────────
    const displayedLoans = useMemo(() => {
        const q = loanSearchTerm.toLowerCase().trim();
        if (!q) return customerLoans;
        return customerLoans.filter((l) =>
            String(l.id || "").includes(q) ||
            (l.loan_type || "").toLowerCase().includes(q) ||
            (l.loan_status || "").toLowerCase().includes(q) ||
            String(l.principal_amount || "").includes(q)
        );
    }, [customerLoans, loanSearchTerm]);

    // ── Handle Select Customer ────────────────────────────────────────────────
    const handleSelectCustomer = (cust) => {
        setSelectedCustomer(cust);
        setView("list");
        setLoanSearchTerm("");
    };

    // ── Validation: Create Form ───────────────────────────────────────────────
    const validateCreateForm = () => {
        const errs = {};
        if (!form.loan_type) errs.loan_type = "Loan type is required";
        if (!form.principal_amount || isNaN(Number(form.principal_amount)) || Number(form.principal_amount) <= 0)
            errs.principal_amount = "Enter valid principal amount";
        if (!form.interest_rate || isNaN(Number(form.interest_rate)) || Number(form.interest_rate) <= 0)
            errs.interest_rate = "Enter valid interest rate (% p.a.)";
        if (!form.loan_term || isNaN(Number(form.loan_term)) || Number(form.loan_term) <= 0)
            errs.loan_term = "Enter valid term duration";
        if (!form.start_date) errs.start_date = "Start date is required";
        return errs;
    };

    // ── Create Loan Submit ────────────────────────────────────────────────────
    const handleCreateLoan = async (e) => {
        e.preventDefault();
        const errs = validateCreateForm();
        if (Object.keys(errs).length > 0) {
            setFormErrors(errs);
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                customer_id: Number(selectedCustomer.id),
                principal_amount: parseFloat(form.principal_amount),
                interest_rate: parseFloat(form.interest_rate),
                loan_term: parseInt(form.loan_term, 10),
                loan_type: form.loan_type,
                start_date: new Date(form.start_date).toISOString(),
            };

            const res = await applyLoan(payload);
            const createdLoan = res?.loan;
            const newLoanId = createdLoan?.loan_id || createdLoan?.id;

            // Automatically attempt generating payment schedule for this new loan
            if (newLoanId) {
                try {
                    await createLoanSchedule(newLoanId);
                } catch (scheduleErr) {
                    console.log("Auto-schedule note:", scheduleErr);
                }
            }

            showToast("Loan created successfully & schedule generated!", "success");
            setForm(EMPTY_FORM);
            setFormErrors({});
            setView("list");
            await refreshLoans();
        } catch (err) {
            console.error("Create loan error:", err);
            const detail = err?.response?.data?.detail;
            const msg = typeof detail === "string" ? detail : (detail?.[0]?.msg || "Failed to create loan.");
            showToast(msg, "error");
        } finally {
            setSubmitting(false);
        }
    };

    // ── Open View Details Modal ───────────────────────────────────────────────
    const handleOpenViewModal = async (loan) => {
        setViewModalLoan(loan);
        setViewModalPayments([]);
        setViewModalPaymentsLoading(true);
        try {
            const payments = await getLoanPayments(loan.id);
            setViewModalPayments(Array.isArray(payments) ? payments : []);
        } catch (err) {
            console.log("No payments schedule or error:", err);
            setViewModalPayments([]);
        } finally {
            setViewModalPaymentsLoading(false);
        }
    };

    // ── Generate Schedule inside View Modal ───────────────────────────────────
    const handleGenerateSchedule = async (loanId) => {
        try {
            setViewModalPaymentsLoading(true);
            await createLoanSchedule(loanId);
            showToast("Repayment schedule generated successfully!", "success");
            const payments = await getLoanPayments(loanId);
            setViewModalPayments(Array.isArray(payments) ? payments : []);
        } catch (err) {
            const msg = err?.response?.data?.detail || "Failed to generate schedule.";
            showToast(typeof msg === "string" ? msg : "Error creating schedule", "error");
        } finally {
            setViewModalPaymentsLoading(false);
        }
    };

    // ── Toggle Payment Status (Paid / Pending) ────────────────────────────────
    const handleTogglePaymentStatus = async (payment) => {
        const newStatus = payment.payment_status === "paid" ? "pending" : "paid";
        try {
            await updatePaymentStatus(
                payment.payment_id,
                payment.customer_id,
                payment.loan_id,
                newStatus,
                newStatus === "paid" ? new Date().toISOString() : null
            );
            showToast(`Payment #${payment.payment_number} marked as ${newStatus}!`, "success");
            const updated = await getLoanPayments(payment.loan_id);
            setViewModalPayments(Array.isArray(updated) ? updated : []);
        } catch (err) {
            const msg = err?.response?.data?.detail || "Failed to update payment status.";
            showToast(typeof msg === "string" ? msg : "Error updating payment", "error");
        }
    };

    // ── Open Edit Modal ───────────────────────────────────────────────────────
    const handleOpenEditModal = (loan) => {
        setEditModalLoan(loan);
        setEditForm({
            principal_amount: loan.principal_amount ?? "",
            interest_rate: loan.interest_rate ?? "",
            loan_term: loan.loan_term ?? "",
            loan_type: loan.loan_type ?? "monthly",
            loan_status: loan.loan_status ?? "pending",
            start_date: loan.start_date ? new Date(loan.start_date).toISOString().split("T")[0] : "",
        });
        setEditErrors({});
    };

    // ── Submit Edit Loan ──────────────────────────────────────────────────────
    const handleEditLoanSubmit = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!editForm.principal_amount || Number(editForm.principal_amount) <= 0)
            errs.principal_amount = "Enter a valid amount";
        if (!editForm.interest_rate || Number(editForm.interest_rate) <= 0)
            errs.interest_rate = "Enter valid rate";
        if (!editForm.loan_term || Number(editForm.loan_term) <= 0)
            errs.loan_term = "Enter valid term";
        if (Object.keys(errs).length > 0) {
            setEditErrors(errs);
            return;
        }

        try {
            setEditSubmitting(true);
            const payload = {
                principal_amount: parseFloat(editForm.principal_amount),
                interest_rate: parseFloat(editForm.interest_rate),
                loan_term: parseInt(editForm.loan_term, 10),
                loan_type: editForm.loan_type,
                loan_status: editForm.loan_status,
                start_date: editForm.start_date ? new Date(editForm.start_date).toISOString() : undefined,
            };

            await updateLoan(editModalLoan.id, payload);
            showToast(`Loan #${editModalLoan.id} updated successfully!`, "success");
            setEditModalLoan(null);
            await refreshLoans();
        } catch (err) {
            console.error("Update loan error:", err);
            const detail = err?.response?.data?.detail;
            const msg = typeof detail === "string" ? detail : "Failed to update loan.";
            showToast(msg, "error");
        } finally {
            setEditSubmitting(false);
        }
    };

    // ── Open Delete Modal ─────────────────────────────────────────────────────
    const handleOpenDeleteModal = (loan) => {
        setDeleteModalLoan(loan);
    };

    // ── Confirm Delete Loan ───────────────────────────────────────────────────
    const handleConfirmDelete = async () => {
        if (!deleteModalLoan) return;
        try {
            setDeleteSubmitting(true);
            await deleteLoan(deleteModalLoan.id);
            showToast(`Loan #${deleteModalLoan.id} deleted successfully!`, "success");
            setDeleteModalLoan(null);
            if (viewModalLoan?.id === deleteModalLoan.id) {
                setViewModalLoan(null);
            }
            await refreshLoans();
        } catch (err) {
            console.error("Delete loan error:", err);
            const detail = err?.response?.data?.detail;
            const msg = typeof detail === "string" ? detail : "Failed to delete loan.";
            showToast(msg, "error");
        } finally {
            setDeleteSubmitting(false);
        }
    };

    // ── Live EMI preview for Create Form ──────────────────────────────────────
    const createEMIPreview = useMemo(() => {
        return calculateEMIValue(
            form.principal_amount,
            form.interest_rate,
            form.loan_term,
            form.loan_type
        );
    }, [form.principal_amount, form.interest_rate, form.loan_term, form.loan_type]);

    // ── Live EMI preview for Edit Form ────────────────────────────────────────
    const editEMIPreview = useMemo(() => {
        return calculateEMIValue(
            editForm.principal_amount,
            editForm.interest_rate,
            editForm.loan_term,
            editForm.loan_type
        );
    }, [editForm.principal_amount, editForm.interest_rate, editForm.loan_term, editForm.loan_type]);

    // ══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════════════════
    return (
        <div className="clf-root">
            {/* ── Toast Notification ── */}
            {toast && (
                <div className={`clf-toast clf-toast--${toast.type}`}>
                    <span>{toast.type === "success" ? "✓" : "✕"}</span>
                    <span>{toast.message}</span>
                </div>
            )}

            {/* ══════════════════════════════════════════
                LEFT PANEL — Customer Selection
            ══════════════════════════════════════════ */}
            <aside className="clf-customers-panel">
                <div className="clf-panel-header">
                    <h2 className="clf-panel-title">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        Borrowers
                    </h2>
                    <span className="clf-badge">{customers.length}</span>
                </div>

                <div className="clf-search-wrap">
                    <svg className="clf-search-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    <input
                        id="clf-customer-search"
                        className="clf-search-input"
                        type="text"
                        placeholder="Search borrower…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="clf-loader-wrap">
                        <div className="clf-spinner" />
                        <span>Loading borrowers…</span>
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="clf-empty">No borrowers found.</div>
                ) : (
                    <ul className="clf-customer-list">
                        {filteredCustomers.map((c) => {
                            const cLoansCount = allLoans.filter((l) => Number(l.customer_id) === Number(c.id)).length;
                            return (
                                <li
                                    key={c.id}
                                    className={`clf-customer-item ${selectedCustomer?.id === c.id ? "active" : ""}`}
                                    onClick={() => handleSelectCustomer(c)}
                                >
                                    <div className="clf-avatar">
                                        {(c.name || "?")[0].toUpperCase()}
                                    </div>
                                    <div className="clf-customer-info">
                                        <span className="clf-customer-name">{c.name || "—"}</span>
                                        <span className="clf-customer-sub">{c.phone || c.email || "ID: #" + c.id}</span>
                                    </div>
                                    <span className="clf-cust-loans-tag" title="Total loans">
                                        {cLoansCount} {cLoansCount === 1 ? "loan" : "loans"}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </aside>

            {/* ══════════════════════════════════════════
                RIGHT PANEL — Customer Loans & Actions
            ══════════════════════════════════════════ */}
            <main className="clf-main-panel">
                {!selectedCustomer ? (
                    <div className="clf-placeholder">
                        <svg viewBox="0 0 64 64" fill="none" width="64" height="64">
                            <circle cx="32" cy="32" r="31" stroke="currentColor" strokeWidth="2" opacity=".2" />
                            <path d="M20 32h24M32 20v24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".4" />
                        </svg>
                        <p>Select a borrower from the left to view, create, edit or delete their loans.</p>
                    </div>
                ) : (
                    <>
                        {/* ── Customer Info Banner ── */}
                        <div className="clf-customer-header">
                            <div className="clf-cust-avatar-lg">
                                {(selectedCustomer.name || "?")[0].toUpperCase()}
                            </div>
                            <div>
                                <h2 className="clf-cust-name">{selectedCustomer.name}</h2>
                                <p className="clf-cust-meta">
                                    <span>🆔 ID: #{selectedCustomer.id}</span>
                                    {selectedCustomer.phone && <span>📞 {selectedCustomer.phone}</span>}
                                    {selectedCustomer.email && <span>📧 {selectedCustomer.email}</span>}
                                    {selectedCustomer.pan_number && <span>🪪 PAN: {selectedCustomer.pan_number}</span>}
                                </p>
                            </div>
                            <div className="clf-header-actions clf-ml-auto">
                                {view === "create" ? (
                                    <button
                                        className="clf-btn clf-btn--ghost clf-btn--sm"
                                        onClick={() => setView("list")}
                                    >
                                        ← Back to Loans
                                    </button>
                                ) : (
                                    <button
                                        id="clf-new-loan-btn"
                                        className="clf-btn clf-btn--primary clf-btn--sm"
                                        onClick={() => {
                                            setView("create");
                                            setForm(EMPTY_FORM);
                                            setFormErrors({});
                                        }}
                                    >
                                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                        Create Loan
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── CREATE LOAN VIEW ── */}
                        {view === "create" ? (
                            <div className="clf-form-card">
                                <div className="clf-form-card-header">
                                    <div>
                                        <h3>Apply / Create Loan for {selectedCustomer.name}</h3>
                                        <p className="clf-card-subtitle">
                                            Fill in loan parameters. An installment schedule will automatically be generated.
                                        </p>
                                    </div>
                                </div>

                                <form id="clf-create-loan-form" className="clf-form" onSubmit={handleCreateLoan} noValidate>
                                    <div className="clf-form-grid">
                                        {/* Loan Type */}
                                        <div className="clf-field">
                                            <label htmlFor="clf-loan-type">Loan Frequency / Type</label>
                                            <select
                                                id="clf-loan-type"
                                                value={form.loan_type}
                                                onChange={(e) => setForm({ ...form, loan_type: e.target.value })}
                                                className={formErrors.loan_type ? "error" : ""}
                                            >
                                                <option value="monthly">Monthly</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="yearly">Yearly</option>
                                            </select>
                                            {formErrors.loan_type && <span className="clf-error">{formErrors.loan_type}</span>}
                                        </div>

                                        {/* Principal Amount */}
                                        <div className="clf-field">
                                            <label htmlFor="clf-principal">Principal Amount (₹)</label>
                                            <input
                                                id="clf-principal"
                                                type="number"
                                                placeholder="e.g. 100000"
                                                value={form.principal_amount}
                                                onChange={(e) => setForm({ ...form, principal_amount: e.target.value })}
                                                className={formErrors.principal_amount ? "error" : ""}
                                                min="1"
                                            />
                                            {formErrors.principal_amount && <span className="clf-error">{formErrors.principal_amount}</span>}
                                        </div>

                                        {/* Interest Rate */}
                                        <div className="clf-field">
                                            <label htmlFor="clf-interest">Annual Interest Rate (%)</label>
                                            <input
                                                id="clf-interest"
                                                type="number"
                                                placeholder="e.g. 12"
                                                step="0.1"
                                                value={form.interest_rate}
                                                onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                                                className={formErrors.interest_rate ? "error" : ""}
                                                min="0.1"
                                            />
                                            {formErrors.interest_rate && <span className="clf-error">{formErrors.interest_rate}</span>}
                                        </div>

                                        {/* Loan Term */}
                                        <div className="clf-field">
                                            <label htmlFor="clf-tenure">
                                                Loan Term ({form.loan_type === "weekly" ? "Weeks" : form.loan_type === "yearly" ? "Years" : "Months"})
                                            </label>
                                            <input
                                                id="clf-tenure"
                                                type="number"
                                                placeholder={form.loan_type === "weekly" ? "e.g. 52" : form.loan_type === "yearly" ? "e.g. 3" : "e.g. 12"}
                                                value={form.loan_term}
                                                onChange={(e) => setForm({ ...form, loan_term: e.target.value })}
                                                className={formErrors.loan_term ? "error" : ""}
                                                min="1"
                                            />
                                            {formErrors.loan_term && <span className="clf-error">{formErrors.loan_term}</span>}
                                        </div>

                                        {/* Start Date */}
                                        <div className="clf-field">
                                            <label htmlFor="clf-start-date">Start Date</label>
                                            <input
                                                id="clf-start-date"
                                                type="date"
                                                value={form.start_date}
                                                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                                                className={formErrors.start_date ? "error" : ""}
                                            />
                                            {formErrors.start_date && <span className="clf-error">{formErrors.start_date}</span>}
                                        </div>
                                    </div>

                                    {/* Live EMI Preview Box */}
                                    {createEMIPreview && (
                                        <div className="clf-emi-preview">
                                            <div className="clf-emi-icon">💳</div>
                                            <div className="clf-emi-text">
                                                <span>Estimated Installment EMI:</span>
                                                <strong>{fmt(createEMIPreview)}</strong>
                                                <span className="clf-emi-note">
                                                    / {form.loan_type === "weekly" ? "week" : form.loan_type === "yearly" ? "year" : "month"} for {form.loan_term} installments
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="clf-form-actions">
                                        <button
                                            type="button"
                                            className="clf-btn clf-btn--ghost"
                                            onClick={() => setView("list")}
                                            disabled={submitting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            id="clf-submit-btn"
                                            className="clf-btn clf-btn--primary"
                                            disabled={submitting}
                                        >
                                            {submitting ? "Creating Loan…" : "Create & Generate Schedule"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            /* ── LOANS TABLE VIEW ── */
                            <div className="clf-table-wrap">
                                <div className="clf-section-header">
                                    <div className="clf-section-title-wrap">
                                        <h3>
                                            Loans for {selectedCustomer.name}
                                            <span className="clf-badge">{customerLoans.length}</span>
                                        </h3>
                                    </div>
                                    <div className="clf-table-tools">
                                        <input
                                            type="text"
                                            className="clf-table-search"
                                            placeholder="Filter loans..."
                                            value={loanSearchTerm}
                                            onChange={(e) => setLoanSearchTerm(e.target.value)}
                                        />
                                        <button
                                            className="clf-btn clf-btn--outline clf-btn--xs"
                                            onClick={refreshLoans}
                                            title="Refresh loan records"
                                        >
                                            ↻ Refresh
                                        </button>
                                    </div>
                                </div>

                                {loansLoading ? (
                                    <div className="clf-loader-wrap clf-mt">
                                        <div className="clf-spinner" />
                                        <span>Loading loans…</span>
                                    </div>
                                ) : displayedLoans.length === 0 ? (
                                    <div className="clf-empty-loans">
                                        <svg viewBox="0 0 64 64" fill="none" width="48" height="48">
                                            <rect x="8" y="12" width="48" height="40" rx="4" stroke="currentColor" strokeWidth="2" opacity=".25" />
                                            <path d="M20 28h24M20 36h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".4" />
                                        </svg>
                                        <p>No loans found for this customer.</p>
                                        <button
                                            className="clf-btn clf-btn--primary clf-btn--sm clf-mt"
                                            onClick={() => {
                                                setView("create");
                                                setForm(EMPTY_FORM);
                                            }}
                                        >
                                            + Create Loan Now
                                        </button>
                                    </div>
                                ) : (
                                    <div className="clf-table-scroll">
                                        <table className="clf-table">
                                            <thead>
                                                <tr>
                                                    <th>Loan ID</th>
                                                    <th>Type</th>
                                                    <th>Principal</th>
                                                    <th>Interest Rate</th>
                                                    <th>Term</th>
                                                    <th>Est. EMI</th>
                                                    <th>Start Date</th>
                                                    <th>Status</th>
                                                    <th style={{ textAlign: "center" }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {displayedLoans.map((loan) => {
                                                    const emi = calculateEMIValue(
                                                        loan.principal_amount,
                                                        loan.interest_rate,
                                                        loan.loan_term,
                                                        loan.loan_type
                                                    );
                                                    const statusKey = (loan.loan_status || "pending").toLowerCase();
                                                    const color = STATUS_COLORS[statusKey] ?? STATUS_COLORS.closed;

                                                    return (
                                                        <tr key={loan.id}>
                                                            <td className="clf-td-mono">#{loan.id}</td>
                                                            <td className="clf-td-type">
                                                                <span className="clf-type-tag">{loan.loan_type || "monthly"}</span>
                                                            </td>
                                                            <td className="clf-td-money">{fmt(loan.principal_amount)}</td>
                                                            <td>{loan.interest_rate}% p.a.</td>
                                                            <td>
                                                                {loan.loan_term}{" "}
                                                                <span className="clf-muted">
                                                                    {loan.loan_type === "weekly" ? "wks" : loan.loan_type === "yearly" ? "yrs" : "mos"}
                                                                </span>
                                                            </td>
                                                            <td className="clf-td-money clf-emi-cell">{emi ? fmt(emi) : "—"}</td>
                                                            <td>{fmtDate(loan.start_date)}</td>
                                                            <td>
                                                                <span
                                                                    className="clf-status-badge"
                                                                    style={{ background: color.bg, color: color.text }}
                                                                >
                                                                    {loan.loan_status || "pending"}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div className="clf-action-group">
                                                                    {/* VIEW BUTTON */}
                                                                    <button
                                                                        id={`clf-btn-view-${loan.id}`}
                                                                        className="clf-action-btn clf-action-btn--view"
                                                                        title="View loan details & schedule"
                                                                        onClick={() => handleOpenViewModal(loan)}
                                                                    >
                                                                        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                                                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                                        </svg>
                                                                        <span>View</span>
                                                                    </button>

                                                                    {/* SCHEDULE BUTTON (Links to Main Menu Payment Schedule) */}
                                                                    {onNavigateToSchedule && (
                                                                        <button
                                                                            id={`clf-btn-sched-${loan.id}`}
                                                                            className="clf-action-btn clf-action-btn--schedule"
                                                                            title="Open Payment Schedule in main menu"
                                                                            onClick={() => onNavigateToSchedule(loan, selectedCustomer)}
                                                                        >
                                                                            <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                                                                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                                            </svg>
                                                                            <span>Schedule</span>
                                                                        </button>
                                                                    )}

                                                                    {/* EDIT BUTTON */}
                                                                    <button
                                                                        id={`clf-btn-edit-${loan.id}`}
                                                                        className="clf-action-btn clf-action-btn--edit"
                                                                        title="Edit loan details"
                                                                        onClick={() => handleOpenEditModal(loan)}
                                                                    >
                                                                        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                                        </svg>
                                                                        <span>Edit</span>
                                                                    </button>

                                                                    {/* DELETE BUTTON */}
                                                                    <button
                                                                        id={`clf-btn-delete-${loan.id}`}
                                                                        className="clf-action-btn clf-action-btn--delete"
                                                                        title="Delete loan"
                                                                        onClick={() => handleOpenDeleteModal(loan)}
                                                                    >
                                                                        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                        </svg>
                                                                        <span>Delete</span>
                                                                    </button>
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
                        )}
                    </>
                )}
            </main>

            {/* ══════════════════════════════════════════════════════════════════
                MODAL 1: VIEW LOAN DETAILS & REPAYMENT SCHEDULE
            ══════════════════════════════════════════════════════════════════ */}
            {viewModalLoan && (
                <div className="clf-modal-overlay" onClick={() => setViewModalLoan(null)}>
                    <div className="clf-modal-content clf-modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="clf-modal-header">
                            <div className="clf-modal-title-wrap">
                                <h2>Loan Details & Payment Schedule</h2>
                                <span className="clf-modal-sub">Loan #{viewModalLoan.id} &middot; {selectedCustomer?.name}</span>
                            </div>
                            <button className="clf-modal-close" onClick={() => setViewModalLoan(null)}>✕</button>
                        </div>

                        <div className="clf-modal-body">
                            {/* Summary Metrics Grid */}
                            <div className="clf-loan-summary">
                                <div className="clf-summary-card">
                                    <span className="clf-summary-label">Borrower</span>
                                    <span className="clf-summary-value">{selectedCustomer?.name}</span>
                                </div>
                                <div className="clf-summary-card clf-highlight">
                                    <span className="clf-summary-label">Principal Amount</span>
                                    <span className="clf-summary-value">{fmt(viewModalLoan.principal_amount)}</span>
                                </div>
                                <div className="clf-summary-card">
                                    <span className="clf-summary-label">Interest Rate</span>
                                    <span className="clf-summary-value">{viewModalLoan.interest_rate}% p.a.</span>
                                </div>
                                <div className="clf-summary-card">
                                    <span className="clf-summary-label">Term Duration</span>
                                    <span className="clf-summary-value">{viewModalLoan.loan_term} ({viewModalLoan.loan_type})</span>
                                </div>
                                <div className="clf-summary-card clf-highlight-green">
                                    <span className="clf-summary-label">Est. EMI</span>
                                    <span className="clf-summary-value">
                                        {fmt(calculateEMIValue(viewModalLoan.principal_amount, viewModalLoan.interest_rate, viewModalLoan.loan_term, viewModalLoan.loan_type))}
                                    </span>
                                </div>
                                <div className="clf-summary-card">
                                    <span className="clf-summary-label">Status</span>
                                    <span className="clf-summary-value">
                                        <span
                                            className="clf-status-badge"
                                            style={{
                                                background: (STATUS_COLORS[(viewModalLoan.loan_status || "pending").toLowerCase()] ?? STATUS_COLORS.closed).bg,
                                                color: (STATUS_COLORS[(viewModalLoan.loan_status || "pending").toLowerCase()] ?? STATUS_COLORS.closed).text,
                                            }}
                                        >
                                            {viewModalLoan.loan_status || "pending"}
                                        </span>
                                    </span>
                                </div>
                                <div className="clf-summary-card">
                                    <span className="clf-summary-label">Start Date</span>
                                    <span className="clf-summary-value">{fmtDate(viewModalLoan.start_date)}</span>
                                </div>
                            </div>

                            {/* Payment Schedule Section */}
                            <div className="clf-modal-section">
                                <div className="clf-section-header clf-modal-section-header">
                                    <h4>
                                        Installment Schedule
                                        <span className="clf-badge">{viewModalPayments.length}</span>
                                    </h4>
                                    {viewModalPayments.length === 0 && (
                                        <button
                                            className="clf-btn clf-btn--primary clf-btn--xs"
                                            onClick={() => handleGenerateSchedule(viewModalLoan.id)}
                                            disabled={viewModalPaymentsLoading}
                                        >
                                            + Generate Schedule
                                        </button>
                                    )}
                                </div>

                                {viewModalPaymentsLoading ? (
                                    <div className="clf-loader-wrap">
                                        <div className="clf-spinner" />
                                        <span>Loading payment records…</span>
                                    </div>
                                ) : viewModalPayments.length === 0 ? (
                                    <div className="clf-empty-loans">
                                        <p>No repayment schedule found for this loan.</p>
                                        <button
                                            className="clf-btn clf-btn--primary clf-btn--sm clf-mt"
                                            onClick={() => handleGenerateSchedule(viewModalLoan.id)}
                                        >
                                            Generate Repayment Schedule
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Payments Stats */}
                                        <div className="clf-payment-summary">
                                            <div className="clf-pay-stat clf-pay-stat--paid">
                                                <span>✓ Total Paid</span>
                                                <strong>
                                                    {fmt(
                                                        viewModalPayments
                                                            .filter((p) => p.payment_status === "paid")
                                                            .reduce((acc, p) => acc + Number(p.emi_amount || p.amount || 0), 0)
                                                    )}
                                                </strong>
                                            </div>
                                            <div className="clf-pay-stat clf-pay-stat--pending">
                                                <span>⏳ Remaining Balance</span>
                                                <strong>
                                                    {fmt(
                                                        viewModalPayments
                                                            .filter((p) => p.payment_status !== "paid")
                                                            .reduce((acc, p) => acc + Number(p.emi_amount || p.amount || 0), 0)
                                                    )}
                                                </strong>
                                            </div>
                                            <div className="clf-pay-stat clf-pay-stat--count">
                                                <span>📋 Total Installments</span>
                                                <strong>{viewModalPayments.length}</strong>
                                            </div>
                                        </div>

                                        {/* Schedule Table */}
                                        <div className="clf-table-scroll clf-modal-table-scroll">
                                            <table className="clf-table">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Due Date</th>
                                                        <th>EMI Amount</th>
                                                        <th>Principal</th>
                                                        <th>Interest</th>
                                                        <th>Paid Date</th>
                                                        <th>Status</th>
                                                        <th style={{ textAlign: "center" }}>Mark Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {viewModalPayments.map((pay) => {
                                                        const pStatus = (pay.payment_status || "pending").toLowerCase();
                                                        const pColor = PAY_STATUS_COLORS[pStatus] ?? PAY_STATUS_COLORS.pending;
                                                        return (
                                                            <tr key={pay.payment_id} className={pStatus === "overdue" ? "clf-row-overdue" : ""}>
                                                                <td className="clf-td-mono">#{pay.payment_number}</td>
                                                                <td>{fmtDate(pay.due_date)}</td>
                                                                <td className="clf-td-money clf-emi-cell">{fmt(pay.emi_amount ?? pay.amount)}</td>
                                                                <td>{fmt(pay.principal_amount)}</td>
                                                                <td>{fmt(pay.interest_amount)}</td>
                                                                <td>{pay.paid_date ? fmtDate(pay.paid_date) : <span className="clf-muted">—</span>}</td>
                                                                <td>
                                                                    <span
                                                                        className="clf-status-badge"
                                                                        style={{ background: pColor.bg, color: pColor.text }}
                                                                    >
                                                                        {pay.payment_status || "pending"}
                                                                    </span>
                                                                </td>
                                                                <td style={{ textAlign: "center" }}>
                                                                    <button
                                                                        className={`clf-btn clf-btn--xs ${pStatus === "paid" ? "clf-btn--ghost" : "clf-btn--primary"
                                                                            }`}
                                                                        onClick={() => handleTogglePaymentStatus(pay)}
                                                                    >
                                                                        {pStatus === "paid" ? "Mark Pending" : "Mark Paid ✓"}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="clf-modal-footer">
                            {onNavigateToSchedule && (
                                <button
                                    className="clf-btn clf-btn--primary clf-btn--sm"
                                    onClick={() => {
                                        const targetLoan = viewModalLoan;
                                        setViewModalLoan(null);
                                        onNavigateToSchedule(targetLoan, selectedCustomer);
                                    }}
                                >
                                    Open Full Payment Schedule ›
                                </button>
                            )}
                            <button
                                className="clf-btn clf-btn--outline clf-btn--sm"
                                onClick={() => {
                                    handleOpenEditModal(viewModalLoan);
                                    setViewModalLoan(null);
                                }}
                            >
                                Edit This Loan
                            </button>
                            <button
                                className="clf-btn clf-btn--ghost clf-btn--sm"
                                onClick={() => setViewModalLoan(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MODAL 2: EDIT LOAN DETAILS
            ══════════════════════════════════════════════════════════════════ */}
            {editModalLoan && (
                <div className="clf-modal-overlay" onClick={() => setEditModalLoan(null)}>
                    <div className="clf-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="clf-modal-header">
                            <div className="clf-modal-title-wrap">
                                <h2>Edit Loan #{editModalLoan.id}</h2>
                                <span className="clf-modal-sub">{selectedCustomer?.name}</span>
                            </div>
                            <button className="clf-modal-close" onClick={() => setEditModalLoan(null)}>✕</button>
                        </div>

                        <form onSubmit={handleEditLoanSubmit}>
                            <div className="clf-modal-body">
                                <div className="clf-form-grid">
                                    {/* Loan Type */}
                                    <div className="clf-field">
                                        <label htmlFor="clf-edit-type">Loan Frequency</label>
                                        <select
                                            id="clf-edit-type"
                                            value={editForm.loan_type || "monthly"}
                                            onChange={(e) => setEditForm({ ...editForm, loan_type: e.target.value })}
                                        >
                                            <option value="monthly">Monthly</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="yearly">Yearly</option>
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div className="clf-field">
                                        <label htmlFor="clf-edit-status">Loan Status</label>
                                        <select
                                            id="clf-edit-status"
                                            value={editForm.loan_status || "pending"}
                                            onChange={(e) => setEditForm({ ...editForm, loan_status: e.target.value })}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="active">Active</option>
                                            <option value="approved">Approved</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>

                                    {/* Principal Amount */}
                                    <div className="clf-field">
                                        <label htmlFor="clf-edit-principal">Principal Amount (₹)</label>
                                        <input
                                            id="clf-edit-principal"
                                            type="number"
                                            value={editForm.principal_amount}
                                            onChange={(e) => setEditForm({ ...editForm, principal_amount: e.target.value })}
                                            className={editErrors.principal_amount ? "error" : ""}
                                            min="1"
                                        />
                                        {editErrors.principal_amount && <span className="clf-error">{editErrors.principal_amount}</span>}
                                    </div>

                                    {/* Interest Rate */}
                                    <div className="clf-field">
                                        <label htmlFor="clf-edit-rate">Annual Interest Rate (%)</label>
                                        <input
                                            id="clf-edit-rate"
                                            type="number"
                                            step="0.1"
                                            value={editForm.interest_rate}
                                            onChange={(e) => setEditForm({ ...editForm, interest_rate: e.target.value })}
                                            className={editErrors.interest_rate ? "error" : ""}
                                            min="0.1"
                                        />
                                        {editErrors.interest_rate && <span className="clf-error">{editErrors.interest_rate}</span>}
                                    </div>

                                    {/* Term */}
                                    <div className="clf-field">
                                        <label htmlFor="clf-edit-term">Loan Term Duration</label>
                                        <input
                                            id="clf-edit-term"
                                            type="number"
                                            value={editForm.loan_term}
                                            onChange={(e) => setEditForm({ ...editForm, loan_term: e.target.value })}
                                            className={editErrors.loan_term ? "error" : ""}
                                            min="1"
                                        />
                                        {editErrors.loan_term && <span className="clf-error">{editErrors.loan_term}</span>}
                                    </div>

                                    {/* Start Date */}
                                    <div className="clf-field">
                                        <label htmlFor="clf-edit-start-date">Start Date</label>
                                        <input
                                            id="clf-edit-start-date"
                                            type="date"
                                            value={editForm.start_date}
                                            onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {editEMIPreview && (
                                    <div className="clf-emi-preview clf-mt">
                                        <div className="clf-emi-icon">💳</div>
                                        <div className="clf-emi-text">
                                            <span>Recalculated EMI:</span>
                                            <strong>{fmt(editEMIPreview)}</strong>
                                            <span className="clf-emi-note">
                                                / {editForm.loan_type === "weekly" ? "wk" : editForm.loan_type === "yearly" ? "yr" : "mo"}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="clf-modal-footer">
                                <button
                                    type="button"
                                    className="clf-btn clf-btn--ghost"
                                    onClick={() => setEditModalLoan(null)}
                                    disabled={editSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="clf-btn clf-btn--primary"
                                    disabled={editSubmitting}
                                >
                                    {editSubmitting ? "Saving…" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MODAL 3: DELETE LOAN CONFIRMATION
            ══════════════════════════════════════════════════════════════════ */}
            {deleteModalLoan && (
                <div className="clf-modal-overlay" onClick={() => setDeleteModalLoan(null)}>
                    <div className="clf-modal-content clf-modal-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="clf-delete-icon-wrap">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h3 className="clf-delete-title">Delete Loan #{deleteModalLoan.id}?</h3>
                        <p className="clf-delete-desc">
                            Are you sure you want to permanently delete this <strong>{fmt(deleteModalLoan.principal_amount)}</strong> loan for <strong>{selectedCustomer?.name}</strong>?
                            This action cannot be undone.
                        </p>
                        <div className="clf-modal-footer clf-delete-actions">
                            <button
                                className="clf-btn clf-btn--ghost"
                                onClick={() => setDeleteModalLoan(null)}
                                disabled={deleteSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                id="clf-confirm-delete-btn"
                                className="clf-btn clf-btn--danger"
                                onClick={handleConfirmDelete}
                                disabled={deleteSubmitting}
                            >
                                {deleteSubmitting ? "Deleting…" : "Yes, Delete Loan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
