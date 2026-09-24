import React, { useState, useEffect } from "react";
import "./customer.css";
import { addCustomer, updateCustomer } from "../../api";

function AddCustomer({ onClose, onSuccess, customerToEdit = null }) {
    const isEditMode = Boolean(customerToEdit && customerToEdit.id);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        aadhar_number: "",
        pan_number: "",
        income_details: ""
    });

    useEffect(() => {
        if (customerToEdit) {
            setFormData({
                name: customerToEdit.name || "",
                email: customerToEdit.email || "",
                phone: customerToEdit.phone || "",
                address: customerToEdit.address || "",
                aadhar_number: customerToEdit.aadhar_number || "",
                pan_number: customerToEdit.pan_number || "",
                income_details: customerToEdit.income_details || ""
            });
        }
    }, [customerToEdit]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: name === "pan_number" ? value.toUpperCase() : value
        }));
    };

    const handleReset = () => {
        if (isEditMode && customerToEdit) {
            setFormData({
                name: customerToEdit.name || "",
                email: customerToEdit.email || "",
                phone: customerToEdit.phone || "",
                address: customerToEdit.address || "",
                aadhar_number: customerToEdit.aadhar_number || "",
                pan_number: customerToEdit.pan_number || "",
                income_details: customerToEdit.income_details || ""
            });
        } else {
            setFormData({
                name: "",
                email: "",
                phone: "",
                address: "",
                aadhar_number: "",
                pan_number: "",
                income_details: ""
            });
        }
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMessage(null);

        try {
            const customerPayload = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                address: formData.address.trim(),
                aadhar_number: formData.aadhar_number.trim(),
                pan_number: formData.pan_number.trim().toUpperCase(),
                income_details: formData.income_details.trim()
            };

            let response;
            if (isEditMode) {
                response = await updateCustomer(customerToEdit.id, customerPayload);
                setMessage("Customer updated successfully!");
            } else {
                response = await addCustomer(customerPayload);
                setMessage("Customer registered successfully!");
                handleReset();
            }

            if (onSuccess) {
                setTimeout(() => {
                    onSuccess(response);
                }, 600);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.detail || "Failed to save customer. Please check inputs.";
            setError(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="add-customer-card">
            <div className="add-customer-header">
                <div>
                    <h2 className="add-customer-title">
                        {isEditMode ? "Edit Customer Details" : "Onboard New Customer"}
                    </h2>
                    <p className="add-customer-subtitle">
                        {isEditMode
                            ? `Updating records for customer ID #${customerToEdit.id}`
                            : "Enter borrower personal, identification, and financial information."}
                    </p>
                </div>
                {onClose && (
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={onClose}
                        title="Close"
                        aria-label="Close modal"
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>

            {message && (
                <div className="customer-alert customer-alert-success">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{message}</span>
                </div>
            )}

            {error && (
                <div className="customer-alert customer-alert-error">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="add-customer-form">
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="cust_name">Full Name <span className="req">*</span></label>
                        <input
                            id="cust_name"
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="e.g. Rahul Sharma"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="cust_email">Email Address <span className="req">*</span></label>
                        <input
                            id="cust_email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="e.g. rahul.sharma@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="cust_phone">Phone Number <span className="req">*</span></label>
                        <input
                            id="cust_phone"
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="e.g. +91 9876543210"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="cust_pan">PAN Card Number <span className="req">*</span></label>
                        <input
                            id="cust_pan"
                            type="text"
                            name="pan_number"
                            value={formData.pan_number}
                            onChange={handleInputChange}
                            placeholder="e.g. ABCDE1234F"
                            maxLength={10}
                            style={{ textTransform: "uppercase" }}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="cust_aadhar">Aadhaar Number <span className="req">*</span></label>
                        <input
                            id="cust_aadhar"
                            type="text"
                            name="aadhar_number"
                            value={formData.aadhar_number}
                            onChange={handleInputChange}
                            placeholder="e.g. 123456789012"
                            maxLength={12}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="cust_income">Income Details <span className="req">*</span></label>
                        <input
                            id="cust_income"
                            type="text"
                            name="income_details"
                            value={formData.income_details}
                            onChange={handleInputChange}
                            placeholder="e.g. ₹ 7,50,000 / annum (Salaried)"
                            required
                        />
                    </div>

                    <div className="form-group full-width">
                        <label htmlFor="cust_address">Residential Address <span className="req">*</span></label>
                        <textarea
                            id="cust_address"
                            name="address"
                            rows={3}
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="e.g. Flat 402, Lotus Towers, MG Road, Bengaluru, Karnataka - 560001"
                            required
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleReset}
                        disabled={isLoading}
                    >
                        Reset
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                {isEditMode ? "Saving Changes..." : "Creating Customer..."}
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                {isEditMode ? "Update Customer" : "Save & Register Customer"}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AddCustomer;