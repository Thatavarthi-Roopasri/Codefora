import { Navbar } from "../components/Navbar";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <main className="rooms-layout" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div style={{ maxWidth: "880px", margin: "0 auto", padding: "60px 20px", flex: 1, color: "var(--text)" }}>
        <button 
          onClick={() => navigate('/home')}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", marginBottom: "24px", fontSize: "14px", padding: 0 }}
        >
          <ArrowLeft size={16} /> Back to Home
        </button>
        <h1 style={{ color: "var(--brand-primary)", marginBottom: "16px", fontSize: "36px" }}>Privacy Policy</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "40px", fontSize: "14px" }}>Last updated: June 10, 2026</p>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>1. Introduction</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            Welcome to Codefora ("Company", "we", "our", "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            This Privacy Policy applies to all users of the Codefora platform, including individuals participating in coding rooms, battles, contests, and any other services provided by Codefora (collectively, the "Services").
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>2. Data We Collect About You</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            Personal data, or personal information, means any information about an individual from which that person can be identified. It does not include data where the identity has been removed (anonymous data).
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
          </p>
          <ul style={{ lineHeight: 1.7, marginBottom: "16px", paddingLeft: "24px", color: "var(--text-muted)" }}>
            <li style={{ marginBottom: "8px" }}><strong style={{ color: "var(--text)" }}>Identity Data</strong> includes first name, last name, username or similar identifier, and profile picture.</li>
            <li style={{ marginBottom: "8px" }}><strong style={{ color: "var(--text)" }}>Contact Data</strong> includes email address and telephone numbers.</li>
            <li style={{ marginBottom: "8px" }}><strong style={{ color: "var(--text)" }}>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
            <li style={{ marginBottom: "8px" }}><strong style={{ color: "var(--text)" }}>Profile Data</strong> includes your username and password, submissions made by you, your interests, preferences, feedback, and survey responses.</li>
            <li style={{ marginBottom: "8px" }}><strong style={{ color: "var(--text)" }}>Usage Data</strong> includes information about how you use our website, products and services, including code submissions, chat logs within public rooms, and participation in contests.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>3. How We Use Your Data</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
          </p>
          <ul style={{ lineHeight: 1.7, marginBottom: "16px", paddingLeft: "24px", color: "var(--text-muted)" }}>
            <li style={{ marginBottom: "8px" }}>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., providing access to Codefora rooms).</li>
            <li style={{ marginBottom: "8px" }}>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
            <li style={{ marginBottom: "8px" }}>Where we need to comply with a legal obligation.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>4. Data Security</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know. They will only process your personal data on our instructions and they are subject to a duty of confidentiality.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            We have put in place procedures to deal with any suspected personal data breach and will notify you and any applicable regulator of a breach where we are legally required to do so.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>5. Your Legal Rights</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:
          </p>
          <ul style={{ lineHeight: 1.7, marginBottom: "16px", paddingLeft: "24px", color: "var(--text-muted)" }}>
            <li style={{ marginBottom: "8px" }}>Request access to your personal data.</li>
            <li style={{ marginBottom: "8px" }}>Request correction of your personal data.</li>
            <li style={{ marginBottom: "8px" }}>Request erasure of your personal data.</li>
            <li style={{ marginBottom: "8px" }}>Object to processing of your personal data.</li>
            <li style={{ marginBottom: "8px" }}>Request restriction of processing your personal data.</li>
            <li style={{ marginBottom: "8px" }}>Request transfer of your personal data.</li>
            <li style={{ marginBottom: "8px" }}>Right to withdraw consent.</li>
          </ul>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            If you wish to exercise any of the rights set out above, please contact us via the Support page.
          </p>
        </section>

      </div>
    </main>
  );
}
