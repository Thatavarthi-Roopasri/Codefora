export function AppToast({ message, tone = "info" }) {
  if (!message) return null;

  return (
    <div className={`app-toast app-toast--${tone}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
