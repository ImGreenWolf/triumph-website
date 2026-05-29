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

// block-preview-mock:link
import React2 from "react";
function CMSLink(props) {
  return React2.createElement("a", { className: props.className, href: props.url || "#" }, props.children || props.label);
}

// src/blocks/CallToAction/Component.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var CallToActionBlock = ({ links, richText }) => {
  return /* @__PURE__ */ jsx("div", { className: "container", children: /* @__PURE__ */ jsxs("div", { className: "bg-card rounded border-border border p-4 flex flex-col gap-8 md:flex-row md:justify-between md:items-center", children: [
    /* @__PURE__ */ jsx("div", { className: "max-w-[48rem] flex items-center", children: richText && /* @__PURE__ */ jsx(RichText, { className: "mb-0", data: richText, enableGutter: false }) }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-8", children: (links || []).map(({ link }, i) => {
      return /* @__PURE__ */ jsx(CMSLink, { size: "lg", ...link }, i);
    }) })
  ] }) });
};
export {
  CallToActionBlock
};
