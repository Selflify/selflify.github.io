function setupCopyButtons() {
  const buttons = document.querySelectorAll("[data-copy-target]");

  for (const button of buttons) {
    button.addEventListener("click", async () => {
      const targetId = button.getAttribute("data-copy-target");
      const target = targetId ? document.getElementById(targetId) : null;

      if (!target) {
        return;
      }

      const content = target.textContent ?? "";

      try {
        await navigator.clipboard.writeText(content.trim());
        const original = button.textContent;
        button.textContent = "Copied";
        window.setTimeout(() => {
          button.textContent = original;
        }, 1600);
      } catch {
        button.textContent = "Copy failed";
      }
    });
  }
}

function setupExpandableCodeExamples() {
  const buttons = document.querySelectorAll("[data-expandable-code] .code-example-summary");

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const container = button.closest("[data-expandable-code]");

      if (!container) {
        return;
      }

      const isOpen = container.classList.toggle("is-open");
      button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupCopyButtons();
  setupExpandableCodeExamples();
});
