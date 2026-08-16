export const copyToClipboard = async (text) => {
  const value = String(text ?? "");

  if (!value) {
    throw new Error("Nothing to copy");
  }

  // Prefer the synchronous path first so it runs inside the user's click gesture.
  try {
    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.readOnly = true;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "-9999px";
    textArea.style.width = "1px";
    textArea.style.height = "1px";
    textArea.style.padding = "0";
    textArea.style.border = "0";
    textArea.style.outline = "0";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";

    document.body.appendChild(textArea);
    textArea.focus({ preventScroll: true });
    textArea.select();
    textArea.setSelectionRange(0, value.length);

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);

    if (successful) {
      return true;
    }
  } catch (err) {
    console.error("Clipboard fallback failed", err);
  }

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (err) {
      console.error("Clipboard API failed", err);
    }
  }

  throw new Error("Unable to copy to clipboard");
};
