import { Navbar } from "../components/Navbar";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function TermsOfServicePage() {
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
        <h1 style={{ color: "var(--brand-primary)", marginBottom: "16px", fontSize: "36px" }}>Terms of Service</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "40px", fontSize: "14px" }}>Last updated: June 10, 2026</p>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>1. Acceptance of Terms</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            By accessing or using the Codefora platform, services, and website (collectively, the "Services"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, then you may not access the Service.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>2. Description of Service</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            Codefora provides a real-time competitive coding platform that allows developers to collaborate in rooms, solve algorithmic problems, compete in battles, and participate in contests. The Service includes the underlying infrastructure, code execution environments, real-time communication tools (text, audio, video), and user community features.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>3. User Accounts</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>4. Acceptable Use and Conduct</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            You agree not to use the Service in any way that violates any applicable national or international law or regulation. Furthermore, you agree not to:
          </p>
          <ul style={{ lineHeight: 1.7, marginBottom: "16px", paddingLeft: "24px", color: "var(--text-muted)" }}>
            <li style={{ marginBottom: "8px" }}>Attempt to exploit, harm, or disrupt the Codefora code execution environment (e.g., executing malicious code, fork bombs, network scanning from within the playground).</li>
            <li style={{ marginBottom: "8px" }}>Engage in cheating, plagiarism, or any behavior that undermines the integrity of Codefora contests and battles.</li>
            <li style={{ marginBottom: "8px" }}>Harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate based on gender, sexual orientation, religion, ethnicity, race, age, national origin, or disability.</li>
            <li style={{ marginBottom: "8px" }}>Spam other users in rooms or community discussions.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>5. Intellectual Property</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of Codefora and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Codefora.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            By submitting code to public repositories or participating in public rooms, you grant Codefora a worldwide, non-exclusive, royalty-free license to use, reproduce, and display the content in connection with the Service.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>6. Limitation of Liability</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            In no event shall Codefora, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>7. Changes to Terms</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </p>
        </section>

      </div>
    </main>
  );
}
