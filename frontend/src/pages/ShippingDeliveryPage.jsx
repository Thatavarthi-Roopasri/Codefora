import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/problems-v2.css";

export function ShippingDeliveryPage() {
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
        <h1 style={{ fontSize: "2rem", marginBottom: "20px", color: "var(--text-primary, #fff)" }}>Shipping & Delivery Policy</h1>
        
        <div style={{ color: "var(--text-secondary, rgba(255,255,255,0.7))", lineHeight: "1.6" }}>
          <p style={{ marginBottom: "16px" }}>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 style={{ marginTop: "24px", marginBottom: "12px", color: "var(--text-primary, #fff)", fontSize: "1.25rem" }}>1. Delivery of Digital Goods</h2>
          <p style={{ marginBottom: "16px" }}>
            Codefora primarily offers digital services and subscriptions. Upon successful payment, your account will instantly be upgraded, and you will receive an email confirmation containing your transaction details. No physical shipping is required.
          </p>
          
          <h2 style={{ marginTop: "24px", marginBottom: "12px", color: "var(--text-primary, #fff)", fontSize: "1.25rem" }}>2. Processing Time</h2>
          <p style={{ marginBottom: "16px" }}>
            All subscription activations and digital product access are processed immediately upon receipt of payment. In rare cases of network delays, it may take up to 24 hours for the services to reflect in your account.
          </p>

          <h2 style={{ marginTop: "24px", marginBottom: "12px", color: "var(--text-primary, #fff)", fontSize: "1.25rem" }}>3. Support & Issues</h2>
          <p style={{ marginBottom: "16px" }}>
            If you have made a payment but have not received access to the services within 24 hours, please contact our support team immediately so we can resolve the issue.
          </p>

          <h2 style={{ marginTop: "24px", marginBottom: "12px", color: "var(--text-primary, #fff)", fontSize: "1.25rem" }}>4. Contact Information</h2>
          <p style={{ marginBottom: "16px" }}>
            For any queries regarding the delivery of your digital products, reach out to us at:
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
