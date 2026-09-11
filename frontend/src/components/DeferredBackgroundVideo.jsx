import { useEffect, useState } from "react";

export function DeferredBackgroundVideo({ className, style, poster, sourceLoader, type = "video/mp4" }) {
  const [source, setSource] = useState("");

  useEffect(() => {
    let active = true;
    const load = () => {
      sourceLoader()
        .then((module) => {
          if (active) setSource(module.default || module);
        })
        .catch(() => {});
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(load, { timeout: 2000 });
      return () => {
        active = false;
        window.cancelIdleCallback(idleId);
      };
    }

    const timer = window.setTimeout(load, 800);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [sourceLoader]);

  if (!source) {
    return poster ? (
      <div
        className={className}
        style={{
          ...style,
          backgroundImage: `url(${poster})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
        aria-hidden="true"
      />
    ) : null;
  }

  return (
    <video autoPlay loop muted playsInline preload="metadata" className={className} style={style} aria-hidden="true">
      <source src={source} type={type} />
    </video>
  );
}
