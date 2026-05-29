// block-preview-mock:payload-config
var payload_config_default = {};

// block-preview-mock:payload
async function getPayload() {
  return {
    async find() {
      return { docs: [] };
    }
  };
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

// src/blocks/EventsBlock/Component.tsx
import { jsx } from "react/jsx-runtime";
var EventsBlock = async (props) => {
  const { id, introContent, limit: limitFromProps, populateBy, selectedDocs } = props;
  const limit = limitFromProps || 3;
  let events = [];
  if (populateBy === "collection") {
    const payload = await getPayload({ config: payload_config_default });
    const fetchedPosts = await payload.find({
      collection: "events",
      depth: 1,
      limit
    });
    events = fetchedPosts.docs;
  } else {
    if (selectedDocs?.length) {
      const filteredSelectedPosts = selectedDocs.map((post) => {
        if (typeof post.value === "object") return post.value;
      });
      events = filteredSelectedPosts;
    }
  }
  return /* @__PURE__ */ jsx("div", { className: "my-16", id: `block-${id}`, children: introContent && /* @__PURE__ */ jsx("div", { className: "container mb-16", children: /* @__PURE__ */ jsx(RichText, { className: "ms-0 max-w-[48rem]", data: introContent, enableGutter: false }) }) });
};
export {
  EventsBlock
};
