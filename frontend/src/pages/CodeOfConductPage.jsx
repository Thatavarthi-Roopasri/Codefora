import { Navbar } from "../components/Navbar";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CodeOfConductPage() {
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
        <h1 style={{ color: "var(--brand-primary)", marginBottom: "16px", fontSize: "36px" }}>Code of Conduct</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "40px", fontSize: "14px" }}>Last updated: June 10, 2026</p>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>Our Pledge</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to making participation in our project and our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>Our Standards</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            Examples of behavior that contributes to creating a positive environment include:
          </p>
          <ul style={{ lineHeight: 1.7, marginBottom: "16px", paddingLeft: "24px", color: "var(--text-muted)" }}>
            <li style={{ marginBottom: "8px" }}>Using welcoming and inclusive language.</li>
            <li style={{ marginBottom: "8px" }}>Being respectful of differing viewpoints and experiences.</li>
            <li style={{ marginBottom: "8px" }}>Gracefully accepting constructive criticism.</li>
            <li style={{ marginBottom: "8px" }}>Focusing on what is best for the community.</li>
            <li style={{ marginBottom: "8px" }}>Showing empathy towards other community members.</li>
          </ul>
          
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            Examples of unacceptable behavior by participants include:
          </p>
          <ul style={{ lineHeight: 1.7, marginBottom: "16px", paddingLeft: "24px", color: "var(--text-muted)" }}>
            <li style={{ marginBottom: "8px" }}>The use of sexualized language or imagery and unwelcome sexual attention or advances.</li>
            <li style={{ marginBottom: "8px" }}>Trolling, insulting/derogatory comments, and personal or political attacks.</li>
            <li style={{ marginBottom: "8px" }}>Public or private harassment.</li>
            <li style={{ marginBottom: "8px" }}>Publishing others' private information, such as a physical or electronic address, without explicit permission.</li>
            <li style={{ marginBottom: "8px" }}>Other conduct which could reasonably be considered inappropriate in a professional setting.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>Enforcement Responsibilities</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            Codefora community moderators are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            Moderators have the right and responsibility to remove, edit, or reject comments, commits, code, wiki edits, issues, and other contributions that are not aligned to this Code of Conduct, or to ban temporarily or permanently any contributor for other behaviors that they deem inappropriate, threatening, offensive, or harmful.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>Scope</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            This Code of Conduct applies both within project spaces (like Coding Rooms, Contests, and Forums) and in public spaces when an individual is representing the project or its community. Examples of representing a project or community include using an official project e-mail address, posting via an official social media account, or acting as an appointed representative at an online or offline event.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "24px" }}>Enforcement</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team via our Support channel. All complaints will be reviewed and investigated and will result in a response that is deemed necessary and appropriate to the circumstances. The project team is obligated to maintain confidentiality with regard to the reporter of an incident.
          </p>
        </section>

      </div>
    </main>
  );
}
