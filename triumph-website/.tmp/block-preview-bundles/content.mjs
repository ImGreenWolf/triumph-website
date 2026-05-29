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

// block-preview-mock:link
import React2 from "react";
function CMSLink(props) {
  return React2.createElement("a", { className: props.className, href: props.url || "#" }, props.children || props.label);
}

// src/blocks/Content/Component.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var ContentBlock = (props) => {
  const { columns } = props;
  const colsSpanClasses = {
    full: "12",
    half: "6",
    oneThird: "4",
    twoThirds: "8"
  };
  return /* @__PURE__ */ jsx("div", { className: "container my-16", children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-4 lg:grid-cols-12 gap-y-8 gap-x-16", children: columns && columns.length > 0 && columns.map((col, index) => {
    const { enableLink, link, richText, size } = col;
    return /* @__PURE__ */ jsxs(
      "div",
      {
        className: cn(`col-span-4 lg:col-span-${colsSpanClasses[size]}`, {
          "md:col-span-2": size !== "full"
        }),
        children: [
          richText && /* @__PURE__ */ jsx(RichText, { data: richText, enableGutter: false }),
          enableLink && /* @__PURE__ */ jsx(CMSLink, { ...link })
        ]
      },
      index
    );
  }) }) });
};
export {
  ContentBlock
};
