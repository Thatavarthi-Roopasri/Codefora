import { Code2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function BrandButton({ logo = false }) {
  const navigate = useNavigate();

  return (
    <button className={logo ? "home-brand" : "ghost-brand"} onClick={() => navigate("/home")}>
      {logo ? <img src="/codefora.png" alt="Codefora logo" /> : <Code2 size={20} />}
      <span>Codefora</span>
    </button>
  );
}
