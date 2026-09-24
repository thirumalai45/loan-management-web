import { useState, useEffect, useMemo } from "react";
import "./customer.css";
import { getCustomers, deleteCustomer } from "../../api";
import AddCustomer from "./AddCustomer";

function CustomerList() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // Modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState(null);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [toast, setToast] = useState(null);

    const [customerToView, setCustomerToView] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, 3500);
    };

    // Fetch customer list
    const getCustomersData = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await getCustomers();
            if (Array.isArray(data)) {
                setCustomers(data);
            } else if (data && typeof data === "object") {
                setCustomers(data.customers || []);
            }
        } catch (err) {
            console.error("Error fetching customers:", err);
            const msg = err.response?.data?.detail || err.message || "Failed to load customers";
            setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getCustomersData();
    }, []);

    // Filtered customers based on search
    const filteredCustomers = useMemo(() => {
        if (!searchTerm.trim()) return customers;
        const q = searchTerm.toLowerCase().trim();
        return customers.filter((c) => {
            const name = (c.name || "").toLowerCase();
            const email = (c.email || "").toLowerCase();
            const phone = (c.phone || "").toLowerCase();
            const pan = (c.pan_number || "").toLowerCase();
            const aadhar = (c.aadhar_number || "").toLowerCase();
            const address = (c.address || "").toLowerCase();
            const id = String(c.id || "");
            return (
                name.includes(q) ||
                email.includes(q) ||
                phone.includes(q) ||
                pan.includes(q) ||
                aadhar.includes(q) ||
                address.includes(q) ||
                id.includes(q)
            );
        });
    }, [customers, searchTerm]);

    // Handle Delete customer
    const confirmDelete = async () => {
        if (!customerToDelete) return;
        try {
            setIsDeleting(true);
            await deleteCustomer(customerToDelete.id);
            setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));
            showToast(`Customer "${customerToDelete.name}" deleted successfully.`);
            setCustomerToDelete(null);
        } catch (err) {
            console.error("Error deleting customer:", err);
            showToast("Failed to delete customer.", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle Add/Edit success
    const handleCustomerSaved = (savedData) => {
        setIsAddModalOpen(false);
        setCustomerToEdit(null);
        getCustomersData();
        showToast(
            customerToEdit
                ? "Customer details updated successfully!"
                : "New customer registered successfully!"
        );
    };

    // Helper for avatar initials
    const getInitials = (name) => {
        if (!name) return "CU";
        const parts = name.trim().split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="customer-list-container">
            {/* Toast notification */}
            {toast && (
                <div className={`customer-toast toast-${toast.type}`}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                        {toast.type === "success" ? (
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        ) : (
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        )}
                    </svg>
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Top Toolbar: Heading, Search & Actions */}
            <div className="customer-page-header">
                <div className="header-text-group">
                    <h2 className="customer-page-title">Customers Directory</h2>
                    <p className="customer-page-subtitle">
                        Manage Customers, verification IDs, and financial profiles.
                    </p>
                </div>

                <div className="header-action-group">
                    {/* Search Bar */}
                    <div className="customer-search-wrapper">
                        <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by name, email, phone, PAN, Aadhaar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="customer-search-input"
                        />
                        {searchTerm && (
                            <button
                                className="search-clear-btn"
                                onClick={() => setSearchTerm("")}
                                title="Clear search"
                            >
                                &times;
                            </button>
                        )}
                    </div>

                    {/* Refresh Button */}
                    <button
                        className="btn-customer-refresh"
                        onClick={getCustomersData}
                        disabled={loading}
                        title="Reload customer data"
                    >
                        <svg
                            className={loading ? "spin-icon" : ""}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        <span>Refresh</span>
                    </button>

                    {/* Quick Add Button (Header) */}
                    <button
                        className="btn-primary"
                        onClick={() => {
                            setCustomerToEdit(null);
                            setIsAddModalOpen(true);
                        }}
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        <span>+ Add Customer</span>
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="customer-alert customer-alert-error" style={{ margin: "1rem 0" }}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                    <button
                        onClick={getCustomersData}
                        style={{ marginLeft: "auto", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 600 }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Active search filter badge info */}
            {searchTerm && (
                <div className="search-status-bar">
                    <span>
                        Showing <strong>{filteredCustomers.length}</strong> matching results for "<em>{searchTerm}</em>"
                    </span>
                    <button className="text-btn" onClick={() => setSearchTerm("")}>
                        Clear Filter
                    </button>
                </div>
            )}

            {/* Table Card */}
            <div className="customer-table-card">
                <div className="customer-table-responsive">
                    <table className="customer-table">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th style={{ width: "60px" }}>ID</th>
                                <th>Customers Details</th>
                                <th>Phone Number</th>
                                <th>PAN Card</th>
                                <th>Aadhaar Number</th>
                                <th>Financial / Income</th>
                                <th>Address</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="table-loading-cell">
                                        <div className="table-spinner-wrap">
                                            <div className="spinner-large"></div>
                                            <span>Loading customer data...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="table-empty-cell">
                                        <div className="empty-state-content">
                                            <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                            </svg>
                                            <h3>{searchTerm ? "No customers found" : "No customers registered yet"}</h3>
                                            <p>
                                                {searchTerm
                                                    ? `No borrower records matched "${searchTerm}". Try a different search keyword.`
                                                    : "Get started by onboarding your first borrower into the LoanOS platform."}
                                            </p>
                                            {searchTerm ? (
                                                <button
                                                    className="btn-secondary"
                                                    onClick={() => setSearchTerm("")}
                                                >
                                                    Clear Search
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn-primary"
                                                    onClick={() => {
                                                        setCustomerToEdit(null);
                                                        setIsAddModalOpen(true);
                                                    }}
                                                >
                                                    + Onboard First Customer
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map((customer, index) => (
                                    <tr key={customer.id} className="customer-row">
                                        <td className="cell-id">
                                            <span className="id-badge">{index + 1}</span>
                                        </td>
                                        <td className="cell-id">
                                            #{customer.id}
                                        </td>
                                        <td>
                                            <div className="borrower-profile-cell">
                                                <div className="borrower-avatar">
                                                    {getInitials(customer.name)}
                                                </div>
                                                <div className="borrower-text">
                                                    <span className="borrower-name">{customer.name}</span>
                                                    <span className="borrower-email">{customer.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="phone-cell">
                                                <svg viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                                </svg>
                                                <span>{customer.phone || "—"}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge-tag badge-pan">
                                                {customer.pan_number || "—"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge-tag badge-aadhar">
                                                {customer.aadhar_number || "—"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="income-cell">
                                                <span>{customer.income_details || "—"}</span>
                                            </div>
                                        </td>
                                        <td className="cell-address" title={customer.address}>
                                            <span>{customer.address || "—"}</span>
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            <div className="action-buttons-group">
                                                <button
                                                    className="action-btn edit-btn"
                                                    onClick={() => {
                                                        setCustomerToEdit(customer);
                                                        setIsAddModalOpen(true);
                                                    }}
                                                    title="Edit customer details"
                                                >
                                                    <svg viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                    <span>Edit</span>
                                                </button>

                                                <button className="action-btn view-btn" onClick={() => setCustomerToView(customer)}><svg viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm2-10a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
                                                </svg>view</button>


                                                <button
                                                    className="action-btn delete-btn"
                                                    onClick={() => setCustomerToDelete(customer)}
                                                    title="Delete customer"
                                                >
                                                    <svg viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    <span>Delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="customer-table-footer">
                    <div className="table-footer-meta">
                        <span className="customer-count-pill">
                            Total Records: <strong>{customers.length}</strong>
                        </span>
                        {searchTerm && (
                            <span className="filter-count-pill">
                                Filtered: <strong>{filteredCustomers.length}</strong>
                            </span>
                        )}
                    </div>

                    <div className="table-footer-actions">
                        <button
                            className="btn-primary btn-add-customer-below-table"
                            onClick={() => {
                                setCustomerToEdit(null);
                                setIsAddModalOpen(true);
                            }}
                        >
                            <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            <span>+ Add Customer</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
               MODAL: ADD / EDIT CUSTOMER
               ══════════════════════════════════════════ */}
            {isAddModalOpen && (
                <div
                    className="modal-overlay"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setIsAddModalOpen(false);
                            setCustomerToEdit(null);
                        }
                    }}
                >
                    <div className="modal-content-wrapper">
                        <AddCustomer
                            onClose={() => {
                                setIsAddModalOpen(false);
                                setCustomerToEdit(null);
                            }}
                            onSuccess={handleCustomerSaved}
                            customerToEdit={customerToEdit}
                        />
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
               MODAL: CONFIRM DELETE CUSTOMER
               ══════════════════════════════════════════ */}
            {customerToDelete && (
                <div className="modal-overlay" onClick={() => setCustomerToDelete(null)}>
                    <div
                        className="modal-dialog delete-dialog"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="delete-dialog-header">
                            <div className="delete-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <div>
                                <h3>Delete Borrower Account</h3>
                                <p>Are you sure you want to delete borrower <strong>{customerToDelete.name}</strong> (ID #{customerToDelete.id})?</p>
                            </div>
                        </div>

                        <div className="delete-warning-box">
                            <span>This will permanently remove the borrower and cannot be undone.</span>
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setCustomerToDelete(null)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-danger"
                                onClick={confirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Yes, Delete Customer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* View Customer Modal */}
            {customerToView && (
                <div className="modal-overlay" onClick={() => setCustomerToView(null)}>
                    <div
                        className="modal-dialog view-dialog"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="view-dialog-header">
                            <div>
                                <h3>View Customer Details</h3>
                                <p>Basic information for Customer #{customerToView.id}</p>
                            </div>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setCustomerToView(null)}
                                title="Close"
                                aria-label="Close modal"
                            >
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>

                        <div className="view-dialog-content">
                            <div className="view-dialog-row">
                                <div className="view-dialog-label">Name</div>
                                <div className="view-dialog-value">{customerToView.name}</div>
                            </div>

                            <div className="view-dialog-row">
                                <div className="view-dialog-label">Email</div>
                                <div className="view-dialog-value">{customerToView.email}</div>
                            </div>

                            <div className="view-dialog-row">
                                <div className="view-dialog-label">Phone</div>
                                <div className="view-dialog-value">{customerToView.phone}</div>
                            </div>

                            <div className="view-dialog-row">
                                <div className="view-dialog-label">Address</div>
                                <div className="view-dialog-value">{customerToView.address}</div>
                            </div>

                            <div className="view-dialog-row">
                                <div className="view-dialog-label">Aadhar Number</div>
                                <div className="view-dialog-value">{customerToView.aadhar_number}</div>
                            </div>

                            <div className="view-dialog-row">
                                <div className="view-dialog-label">PAN Number</div>
                                <div className="view-dialog-value">{customerToView.pan_number}</div>
                            </div>

                            <div className="view-dialog-row">
                                <div className="view-dialog-label">Income Details</div>
                                <div className="view-dialog-value">{customerToView.income_details}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerList;