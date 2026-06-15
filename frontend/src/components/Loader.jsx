import { useEffect, useRef } from "react";
import salsa from "../../assets/salsa.mp4";

export default function Loader({ visible }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoaded = () => {
      try {
        v.currentTime = 2;
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      } catch (e) {}
    };

    const onTimeUpdate = () => {
      if (v.currentTime >= 5) {
        v.currentTime = 2;
      }
    };

    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTimeUpdate);
      try { v.pause(); } catch (e) {}
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="global-loader-overlay" role="status" aria-live="polite">
      <div className="global-loader-backdrop" />
      <div className="global-loader">
        <div className="loader-wrap">
          <div className="loader-circle">
            <div className="loader-sparkle" />
            <div className="loader-video-wrap">
              <video
                ref={videoRef}
                src={salsa}
                muted
                playsInline
                preload="auto"
                className="loader-video"
                loop={false}
                style={{ filter: 'var(--home-video-filter)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
