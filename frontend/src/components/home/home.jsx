import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import CustomerList from "../customer/customerList";
import CreateLoanForCustomers from "../loans/createLoanForCustomers";
import PaymentSchedule from "../loans/paymentSchedule";
import DashboardOverview from "./dashboard";

function Dashboard() {
    const navigate = useNavigate();
    const [activeNav, setActiveNav] = useState("overview");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // ── Cross-nav context: pre-select customer/loan when jumping between sections
    const [schedulePreselect, setSchedulePreselect] = useState({
        customer: null,
        loan: null,
    });
    const [loanDetailsPreselect, setLoanDetailsPreselect] = useState({
        customer: null,
    });

    function handleLogout() {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("tokenType");
        localStorage.removeItem("token");
        navigate("/login");
    }

    // Called from Loan Details → "Schedule ›" button on a loan row
    function handleNavigateToSchedule(loan, customer) {
        setSchedulePreselect({ customer, loan });
        setActiveNav("repayments");
    }

    // Called from Payment Schedule → "View Loan Details ↗" button
    function handleNavigateToLoans(customer) {
        setLoanDetailsPreselect({ customer });
        setActiveNav("loans");
    }

    const breadcrumb =
        activeNav === "customer_List"
            ? "Customers Directory"
            : activeNav === "loans"
            ? "Loan Details"
            : activeNav === "repayments"
            ? "Payment Schedule"
            : "Dashboard";

    const pageTitle =
        activeNav === "customer_List"
            ? "Borrowers & Customers Directory"
            : activeNav === "loans"
            ? "Loan Details"
            : activeNav === "repayments"
            ? "Payment Schedule"
            : "Executive Dashboard";

    return (
        <div className={`dash-layout ${sidebarCollapsed ? "sidebar-mini" : ""}`}>

            <aside className="dash-sidebar">
                <div className="dash-sidebar-header">
                    <div className="dash-brand">
                        <svg viewBox="0 0 32 32" fill="none" className="brand-icon">
                            <rect width="32" height="32" rx="10" fill="rgba(255,255,255,0.18)" />
                            <path d="M8 20l4-8 4 6 3-4 5 6" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {!sidebarCollapsed && <span className="brand-name">LoanOS</span>}
                    </div>
                    <button
                        className="sidebar-toggle-btn"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        aria-label="Toggle Sidebar"
                        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Navigation Menu */}
                <nav className="dash-nav">
                    <div className="nav-group-label">{!sidebarCollapsed && "MAIN MENU"}</div>

                    {/* Dashboard */}
                    <button
                        className={`nav-item ${activeNav === "overview" ? "active" : ""}`}
                        onClick={() => setActiveNav("overview")}
                        title="Dashboard"
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                        {!sidebarCollapsed && <span>Dashboard</span>}
                    </button>

                    {/* Customers List */}
                    <button
                        className={`nav-item ${activeNav === "customer_List" ? "active" : ""}`}
                        onClick={() => setActiveNav("customer_List")}
                        title="Customers List"
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                        </svg>
                        {!sidebarCollapsed && <span>Customers List</span>}
                    </button>

                    {/* Loan Details */}
                    <button
                        className={`nav-item ${activeNav === "loans" ? "active" : ""}`}
                        onClick={() => setActiveNav("loans")}
                        title="Loan Details"
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {!sidebarCollapsed && <span>Loan Details</span>}
                    </button>

                    {/* Payment Schedule */}
                    <button
                        className={`nav-item ${activeNav === "repayments" ? "active" : ""}`}
                        onClick={() => setActiveNav("repayments")}
                        title="Payment Schedule"
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        {!sidebarCollapsed && <span>Payment Schedule</span>}
                    </button>
                </nav>

                {/* Sidebar Bottom Profile */}
                <div className="dash-sidebar-user">
                    <div className="user-profile-badge">
                        <div className="user-avatar">
                            <span>AD</span>
                            <span className="online-indicator"></span>
                        </div>
                        {!sidebarCollapsed && (
                            <div className="user-details">
                                <span className="user-name">Administrator</span>
                                <span className="user-role">Super Admin</span>
                            </div>
                        )}
                    </div>
                    <button
                        className="sidebar-logout-icon-btn"
                        onClick={handleLogout}
                        title="Logout"
                        aria-label="Logout"
                    >
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </aside>

            {/* ══════════════════════════════════════════
               MAIN SHELL: HEADER + CANVAS + FOOTER
               ══════════════════════════════════════════ */}
            <div className="dash-main-container">

                {/* ── 2. HEADER ── */}
                <header className="dash-header">
                    <div className="dash-header-left">
                        <div className="breadcrumb-line">
                            <span className="breadcrumb-root">Portal</span>
                            <span className="breadcrumb-sep">/</span>
                            <span className="breadcrumb-current">{breadcrumb}</span>
                        </div>
                        <h1 className="dash-page-title">{pageTitle}</h1>
                    </div>

                    <div className="dash-header-right">
                        {/* Logout Button */}
                        <button className="header-logout-btn" onClick={handleLogout}>
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Logout</span>
                        </button>
                    </div>
                </header>

                {/* ── MAIN CONTENT AREA ── */}
                <main className="dash-content">
                    {activeNav === "customer_List" ? (
                        <CustomerList />
                    ) : activeNav === "loans" ? (
                        <CreateLoanForCustomers
                            key={`loans-${loanDetailsPreselect.customer?.id ?? "all"}`}
                            preselectedCustomer={loanDetailsPreselect.customer}
                            onNavigateToSchedule={handleNavigateToSchedule}
                        />
                    ) : activeNav === "repayments" ? (
                        <PaymentSchedule
                            key={`repayments-${schedulePreselect.customer?.id ?? "all"}-${schedulePreselect.loan?.id ?? "none"}`}
                            preselectedCustomer={schedulePreselect.customer}
                            preselectedLoan={schedulePreselect.loan}
                            onNavigateToLoans={handleNavigateToLoans}
                        />
                    ) : (
                        <DashboardOverview
                            onNavigateToLoans={handleNavigateToLoans}
                            onNavigateToSchedule={handleNavigateToSchedule}
                        />
                    )}
                </main>

                {/* ── 3. FOOTER ── */}
                <footer className="dash-footer">
                    <div className="dash-footer-inner">
                        <p className="footer-copyright">
                            &copy; {new Date().getFullYear()} <strong>LoanOS</strong> &middot; Enterprise Lending Management &middot; v2.1
                        </p>
                        <div className="footer-links">
                            <a href="#privacy">Privacy Policy</a>
                            <span className="footer-sep">&middot;</span>
                            <a href="#security">Security Compliance</a>
                            <span className="footer-sep">&middot;</span>
                            <a href="#support">Help &amp; Support</a>
                        </div>
                    </div>
                </footer>

            </div >

        </div >
    );
}

export default Dashboard;
