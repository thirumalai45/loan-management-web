import { useState } from "react";
import { loginAdmin } from "../../api";
import { useNavigate } from "react-router-dom";
import "./login.css";

function Login() {
    const navigate = useNavigate();

    const [adminData, setAdminData] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setError("");
        setAdminData({ ...adminData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const data = await loginAdmin(adminData.email, adminData.password);
            localStorage.setItem("adminToken", data.access_token);
            localStorage.setItem("tokenType", data.token_type);
            navigate("/dashboard");
        } catch (err) {
            setError(
                err.response?.status === 401
                    ? "Invalid email or password. Please try again."
                    : "Unable to connect. Please check your network."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">

            {/* ── Left brand panel ── */}
            <aside className="brand-panel">
                <div className="brand-panel-inner">
                    <div className="brand-logo">
                        <svg viewBox="0 0 32 32" fill="none">
                            <rect width="32" height="32" rx="10" fill="rgba(255,255,255,0.15)" />
                            <path d="M8 20l4-8 4 6 3-4 5 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>LoanOS</span>
                    </div>

                    <div className="brand-copy">
                        <h2 className="brand-headline">Manage Loans<br />with Precision.</h2>
                        <p className="brand-tagline">
                            A centralized admin platform built for speed, accuracy, and control.
                        </p>
                    </div>

                    {/* <div className="brand-stats">
                        <div className="stat-item">
                            <span className="stat-value">₹2.4Cr</span>
                            <span className="stat-label">Disbursed</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                            <span className="stat-value">1,240</span>
                            <span className="stat-label">Active Loans</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                            <span className="stat-value">98.3%</span>
                            <span className="stat-label">Recovery Rate</span>
                        </div>
                    </div> */}

                    <div className="deco-ring ring-1"></div>
                    <div className="deco-ring ring-2"></div>
                </div>
            </aside>

            {/* ── Right form panel ── */}
            <main className="form-panel">
                <div className="form-inner">

                    <div className="form-topbar">
                        <span className="secure-tag">
                            <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                            </svg>
                            SSL Secured
                        </span>
                    </div>

                    <div className="form-heading">
                        <h1>Welcome back</h1>
                        <p>Sign in to your admin account to continue</p>
                    </div>

                    {error && (
                        <div className="error-banner" role="alert">
                            <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="login-form" noValidate>

                        {/* Email */}
                        <div className="field-group">
                            <label className="field-label" htmlFor="login-email">Email address</label>
                            <div className="input-wrapper">
                                <svg className="input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                                <input
                                    id="login-email"
                                    type="email"
                                    name="email"
                                    value={adminData.email}
                                    onChange={handleChange}
                                    placeholder="you@company.com"
                                    className="login-input"
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="field-group">
                            <div className="label-row">
                                <label className="field-label" htmlFor="login-password">Password</label>
                                <button type="button" className="forgot-link">Forgot password?</button>
                            </div>
                            <div className="input-wrapper">
                                <svg className="input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" />
                                </svg>
                                <input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={adminData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••••"
                                    className="login-input"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            id="login-submit"
                            type="submit"
                            className={`login-btn${loading ? " loading" : ""}`}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    <span>Authenticating…</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H2" />
                                    </svg>
                                </>
                            )}
                            <span className="btn-glow"></span>
                        </button>

                    </form>

                    <p className="form-footer">
                        &copy; {new Date().getFullYear()} LoanOS &middot; Admin Portal &middot; v2.1
                    </p>
                </div>
            </main>

        </div>
    );
}

export default Login;
