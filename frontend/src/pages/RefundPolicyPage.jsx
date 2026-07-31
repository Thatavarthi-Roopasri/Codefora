import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/problems-v2.css";

export function RefundPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="rooms-container" style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto" }}>
      <button 
        className="button secondary problems-back-button" 
        onClick={() => navigate(-1)}
        style={{ marginBottom: "20px" }}
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      <div className="rooms-card" style={{ padding: "40px" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "20px", color: "var(--text-primary, #fff)" }}>Refund & Cancellation Policy</h1>
        
        <div style={{ color: "var(--text-secondary, rgba(255,255,255,0.7))", lineHeight: "1.6" }}>
          <p style={{ marginBottom: "16px" }}>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 style={{ marginTop: "24px", marginBottom: "12px", color: "var(--text-primary, #fff)", fontSize: "1.25rem" }}>1. Cancellation Policy</h2>
          <p style={{ marginBottom: "16px" }}>
            You may cancel your subscription or service request at any time before the service is fully rendered. Cancellations requested within 24 hours of the initial purchase will be processed without any questions.
          </p>
          
          <h2 style={{ marginTop: "24px", marginBottom: "12px", color: "var(--text-primary, #fff)", fontSize: "1.25rem" }}>2. Refund Eligibility</h2>
          <p style={{ marginBottom: "16px" }}>
            Refunds will be provided for cancellations made within 7 days of the transaction. If the service has already been utilized or the digital product has been accessed, the refund will be processed on a pro-rata basis or may be denied at the discretion of BARG INFO SOLUTIONS.
          </p>

          <h2 style={{ marginTop: "24px", marginBottom: "12px", color: "var(--text-primary, #fff)", fontSize: "1.25rem" }}>3. Refund Process</h2>
          <p style={{ marginBottom: "16px" }}>
            Once your cancellation is approved, the refund will be processed back to your original payment method. Please allow 5-7 business days for the amount to reflect in your bank account.
          </p>

          <h2 style={{ marginTop: "24px", marginBottom: "12px", color: "var(--text-primary, #fff)", fontSize: "1.25rem" }}>4. Contact Us</h2>
          <p style={{ marginBottom: "16px" }}>
            If you have any questions regarding cancellations or refunds, please reach out to us at:
            <br />
            Email: support@codefora.com
            <br />
            Phone: +91 90000 00000
          </p>
        </div>
      </div>
    </div>
  );
}
