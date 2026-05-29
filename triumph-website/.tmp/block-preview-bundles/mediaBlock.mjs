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

// block-preview-mock:media
import React2 from "react";
var srcFrom = (props) => {
  if (typeof props.src === "string") return props.src;
  if (typeof props.resource === "string") return props.resource;
  return props.resource?.url || props.src?.src || "";
};
function Media(props) {
  const src = srcFrom(props);
  return React2.createElement("img", {
    alt: props.alt || props.resource?.alt || "",
    className: props.imgClassName || props.className,
    src
  });
}

// src/blocks/MediaBlock/Component.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var MediaBlock = (props) => {
  const {
    captionClassName,
    className,
    enableGutter = true,
    imgClassName,
    media,
    staticImage,
    disableInnerContainer
  } = props;
  let caption;
  if (media && typeof media === "object") caption = media.caption;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn(
        "",
        {
          container: enableGutter
        },
        className
      ),
      children: [
        (media || staticImage) && /* @__PURE__ */ jsx(
          Media,
          {
            imgClassName: cn("border border-border rounded-[0.8rem]", imgClassName),
            resource: media,
            src: staticImage
          }
        ),
        caption && /* @__PURE__ */ jsx(
          "div",
          {
            className: cn(
              "mt-6",
              {
                container: !disableInnerContainer
              },
              captionClassName
            ),
            children: /* @__PURE__ */ jsx(RichText, { data: caption, enableGutter: false })
          }
        )
      ]
    }
  );
};
export {
  MediaBlock
};
