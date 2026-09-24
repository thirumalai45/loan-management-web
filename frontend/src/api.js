import axios from "axios";
const BASE_URL = "https://loan-management-rygl.onrender.com"

const API = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
})

// Auth API************************************

export const loginAdmin = async (email, password) => {
    const response = await API.post("/auth/login", { email, password });
    return response.data;
};


//customer API**************************************************

export const addCustomer = async (customerData) => {
    const response = await API.post("/customers/add_customer", customerData);
    return response.data;
};

// get all customers
export const getCustomers = async () => {
    const response = await API.get("/customers/get_all_customers");
    return response.data;
};

// get customer by id
export const getCustomerById = async (id) => {
    const response = await API.get(`/customers/get_customer/${id}`);
    return response.data;
};

// update customer
export const updateCustomer = async (id, customerData) => {
    const response = await API.put(`/customers/update_customer/${id}`, customerData);
    return response.data;
};

// delete customer
export const deleteCustomer = async (id) => {
    const response = await API.delete(`/customers/delete_customer/${id}`);
    return response.data;
};


// Loan API*****************************************************

export const applyLoan = async (loanData) => {
    const response = await API.post("/loans/apply", loanData);
    return response.data;
};

export const getAllLoans = async () => {
    const response = await API.get("/loans/");
    return response.data;
};

export const getLoanById = async (id) => {
    const response = await API.get(`/loans/${id}`);
    return response.data;
};

export const updateLoan = async (id, loanData) => {
    const response = await API.put(`/loans/${id}`, loanData);
    return response.data;
};

export const deleteLoan = async (id) => {
    const response = await API.delete(`/loans/${id}`);
    return response.data;
};


// Payments & EMI API*******************************************

export const createLoanSchedule = async (loan_id) => {
    const response = await API.post(`/payments/loans/${loan_id}/payments`);
    return response.data;
};

export const getLoanPayments = async (loan_id) => {
    const response = await API.get(`/payments/loans/${loan_id}/payments`);
    return response.data;
};

export const updatePaymentStatus = async (payment_id, customer_id, loan_id, paymentStatus, paidDate = null) => {
    const payload = { payment_status: paymentStatus };
    if (paidDate) payload.paid_date = paidDate;
    const response = await API.put(`/payments/${payment_id}/status`, payload, {
        params: { customer_id, loan_id }
    });
    return response.data;
};
