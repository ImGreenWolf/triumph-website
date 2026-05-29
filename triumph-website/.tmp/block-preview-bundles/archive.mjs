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

// block-preview-mock:collection-archive
import React2 from "react";
function CollectionArchive() {
  return React2.createElement(
    "div",
    { className: "grid gap-4 md:grid-cols-3" },
    ["Preview item", "Featured story", "Latest update"].map(
      (title) => React2.createElement(
        "article",
        { className: "rounded border p-6", key: title },
        React2.createElement("h3", { className: "text-xl font-semibold mb-3" }, title),
        React2.createElement("p", { className: "text-sm text-muted-foreground" }, "Generated collection preview content.")
      )
    )
  );
}

// src/blocks/ArchiveBlock/Component.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var ArchiveBlock = async (props) => {
  const { id, categories, introContent, limit: limitFromProps, populateBy, selectedDocs } = props;
  const limit = limitFromProps || 3;
  let posts = [];
  if (populateBy === "collection") {
    const payload = await getPayload({ config: payload_config_default });
    const flattenedCategories = categories?.map((category) => {
      if (typeof category === "object") return category.id;
      else return category;
    });
    const fetchedPosts = await payload.find({
      collection: "posts",
      depth: 1,
      limit,
      ...flattenedCategories && flattenedCategories.length > 0 ? {
        where: {
          categories: {
            in: flattenedCategories
          }
        }
      } : {}
    });
    posts = fetchedPosts.docs;
  } else {
    if (selectedDocs?.length) {
      const filteredSelectedPosts = selectedDocs.map((post) => {
        if (typeof post.value === "object") return post.value;
      });
      posts = filteredSelectedPosts;
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: "my-16", id: `block-${id}`, children: [
    introContent && /* @__PURE__ */ jsx("div", { className: "container mb-16", children: /* @__PURE__ */ jsx(RichText, { className: "ms-0 max-w-[48rem]", data: introContent, enableGutter: false }) }),
    /* @__PURE__ */ jsx(CollectionArchive, { posts })
  ] });
};
export {
  ArchiveBlock
};
