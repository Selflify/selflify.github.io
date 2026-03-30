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

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function applyPatternSegments(input, pattern, className) {
  const segments = [];
  let output = "";
  let lastIndex = 0;
  let match;

  const regex = new RegExp(pattern.source, pattern.flags);

  while ((match = regex.exec(input)) !== null) {
    const [fullMatch] = match;
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    output += input.slice(lastIndex, startIndex);
    const token = `__TOKEN_${segments.length}__`;
    segments.push(`<span class="${className}">${fullMatch}</span>`);
    output += token;
    lastIndex = endIndex;

    if (fullMatch.length === 0) {
      regex.lastIndex += 1;
    }
  }

  output += input.slice(lastIndex);

  return {
    output,
    segments,
  };
}

function restorePatternSegments(input, segments) {
  return segments.reduce(
    (restored, segment, index) => restored.replace(`__TOKEN_${index}__`, segment),
    input,
  );
}

function highlightShellLine(line) {
  if (/^\s*#/.test(line)) {
    return `<span class="token-comment">${escapeHtml(line)}</span>`;
  }

  let html = escapeHtml(line);

  const protectedSegments = [
    { pattern: /\$\{\{[^}]+\}\}/g, className: "token-variable" },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, className: "token-string" },
    { pattern: /\$\{[^}]+\}|\$[A-Za-z_][A-Za-z0-9_]*/g, className: "token-variable" },
  ];

  const segmentGroups = [];

  for (const entry of protectedSegments) {
    const result = applyPatternSegments(html, entry.pattern, entry.className);
    html = result.output;
    segmentGroups.push(result.segments);
  }

  html = html
    .replace(/(^|\s)(--[A-Za-z0-9-]+)/g, '$1<span class="token-flag">$2</span>')
    .replace(
      /(^|\s)(curl|bash|mkdir|printf|chmod|rsync|echo|if|then|fi|do|done|for|in)(?=\s|$)/g,
      '$1<span class="token-keyword">$2</span>',
    )
    .replace(/(^|\s)([A-Z][A-Z0-9_]*)(=)/g, '$1<span class="token-key">$2</span><span class="token-punctuation">$3</span>');

  for (let index = segmentGroups.length - 1; index >= 0; index -= 1) {
    html = restorePatternSegments(html, segmentGroups[index]);
  }

  return html;
}

function highlightEnvLine(line) {
  const escapedLine = escapeHtml(line);
  const match = escapedLine.match(/^([A-Z][A-Z0-9_]*)(=)(.*)$/);

  if (!match) {
    return escapedLine;
  }

  const [, key, separator, value] = match;
  const highlightedValue = value.replace(
    /(\$\{[^}]+\}|\$[A-Za-z_][A-Za-z0-9_]*)/g,
    '<span class="token-variable">$1</span>',
  );

  return `<span class="token-key">${key}</span><span class="token-punctuation">${separator}</span><span class="token-string">${highlightedValue}</span>`;
}

function highlightJsonLine(line) {
  let html = escapeHtml(line);

  html = html
    .replace(
      /^(\s*)"([^"]+)"(\s*:)/,
      '$1<span class="token-key">"$2"</span><span class="token-punctuation">$3</span>',
    )
    .replace(/:\s*"([^"]*)"/g, ': <span class="token-string">"$1"</span>')
    .replace(/\b(true|false|null)\b/g, '<span class="token-constant">$1</span>')
    .replace(/\b-?\d+(?:\.\d+)?\b/g, '<span class="token-number">$&</span>');

  return html;
}

function highlightYamlLine(line) {
  if (/^\s*#/.test(line)) {
    return `<span class="token-comment">${escapeHtml(line)}</span>`;
  }

  let html = escapeHtml(line);

  html = html
    .replace(/(\$\{\{[^}]+\}\})/g, '<span class="token-variable">$1</span>')
    .replace(
      /^(\s*-?\s*)([A-Za-z0-9_.-]+)(:\s*)/,
      '$1<span class="token-key">$2</span><span class="token-punctuation">$3</span>',
    )
    .replace(/:\s*"([^"]*)"/g, ': <span class="token-string">"$1"</span>')
    .replace(/:\s*'([^']*)'/g, ": <span class=\"token-string\">'$1'</span>")
    .replace(/\b(true|false|null)\b/g, '<span class="token-constant">$1</span>')
    .replace(/\b\d+\b/g, '<span class="token-number">$&</span>')
    .replace(/\b(actions\/checkout@v\d+|actions\/setup-node@v\d+|Selflify\/[A-Za-z0-9-]+@v\d+)\b/g, '<span class="token-string">$1</span>');

  return html;
}

function highlightCodeBlock(code) {
  const language = code.getAttribute("data-lang");

  if (!language) {
    return;
  }

  const raw = code.textContent ?? "";
  const lines = raw.split("\n");

  const highlighter =
    language === "json"
      ? highlightJsonLine
      : language === "yaml"
        ? highlightYamlLine
        : language === "env"
          ? highlightEnvLine
          : highlightShellLine;

  code.innerHTML = lines.map((line) => highlighter(line)).join("\n");
}

function setupSyntaxHighlighting() {
  const blocks = document.querySelectorAll("pre code[data-lang]");

  for (const block of blocks) {
    if (block instanceof HTMLElement) {
      highlightCodeBlock(block);
    }
  }
}

function setupExpandableCodeExamples() {
  const containers = document.querySelectorAll("[data-expandable-code]");

  for (const container of containers) {
    container.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target instanceof Element) || target.closest(".copy-button")) {
        return;
      }

      const button = container.querySelector(".code-example-summary");

      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const isOpen = container.classList.toggle("is-open");
      button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupSyntaxHighlighting();
  setupCopyButtons();
  setupExpandableCodeExamples();
});
