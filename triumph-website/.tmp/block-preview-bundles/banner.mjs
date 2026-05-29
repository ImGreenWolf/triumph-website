// block-preview-mock:cn
function cn(...inputs) {
  return inputs.flatMap((input) => {
    if (!input) return [];
    if (typeof input === "string") return [input];
    if (Array.isArray(input)) return input;
    if (typeof input === "object") {
      return Object.entries(input).filter(([, value]) => Boolean(value)).map(([key]) => key);
    }
    return [];
  }).join(" ");
}

// block-preview-mock:rich-text
import React from "react";
var renderNode = (node, index) => {
  if (!node) return null;
  if (node.type === "text") return node.text || "";
  const children = Array.isArray(node.children) ? node.children.map(renderNode) : null;
  if (node.type === "heading") return React.createElement(node.tag || "h2", { key: index }, children);
  if (node.type === "paragraph") return React.createElement("p", { key: index }, children);
  if (node.type === "link") return React.createElement("a", { key: index, href: node.fields?.url || "#" }, children);
  return React.createElement("div", { key: index }, children);
};
function RichText({ className, data }) {
  return React.createElement("div", { className }, data?.root?.children?.map(renderNode));
}

// src/blocks/Banner/Component.tsx
import { jsx } from "react/jsx-runtime";
var BannerBlock = ({ className, content, style }) => {
  return /* @__PURE__ */ jsx("div", { className: cn("mx-auto my-8 w-full", className), children: /* @__PURE__ */ jsx(
    "div",
    {
      className: cn("border py-3 px-6 flex items-center rounded", {
        "border-border bg-card": style === "info",
        "border-error bg-error/30": style === "error",
        "border-success bg-success/30": style === "success",
        "border-warning bg-warning/30": style === "warning"
      }),
      children: /* @__PURE__ */ jsx(RichText, { data: content, enableGutter: false, enableProse: false })
    }
  ) });
};
export {
  BannerBlock
};
