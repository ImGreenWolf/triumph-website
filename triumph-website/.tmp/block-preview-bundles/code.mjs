// block-preview-mock:code-client
import React from "react";
function Code({ code }) {
  return React.createElement("pre", { className: "rounded border p-6" }, code || "const preview = true");
}

// src/blocks/Code/Component.tsx
import { jsx } from "react/jsx-runtime";
var CodeBlock = ({ className, code, language }) => {
  return /* @__PURE__ */ jsx("div", { className: [className, "not-prose"].filter(Boolean).join(" "), children: /* @__PURE__ */ jsx(Code, { code, language }) });
};
export {
  CodeBlock
};
