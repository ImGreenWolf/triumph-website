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

// block-preview-mock:media
import React3 from "react";
var srcFrom = (props) => {
  if (typeof props.src === "string") return props.src;
  if (typeof props.resource === "string") return props.resource;
  return props.resource?.url || props.src?.src || "";
};
function Media(props) {
  const src = srcFrom(props);
  return React3.createElement("img", {
    alt: props.alt || props.resource?.alt || "",
    className: props.imgClassName || props.className,
    src
  });
}

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

// src/blocks/HomepageBlocks/Component.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var hasMediaObject = (media) => typeof media === "object" && media !== null;
var SectionIntroBlock = ({ alignment, eyebrow, richText }) => {
  return /* @__PURE__ */ jsx("section", { className: "container", children: /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn("max-w-3xl", {
        "mx-auto text-center": alignment === "center"
      }),
      children: [
        eyebrow && /* @__PURE__ */ jsx("p", { className: "mb-3 text-sm font-semibold uppercase tracking-normal text-muted-foreground", children: eyebrow }),
        richText && /* @__PURE__ */ jsx(RichText, { data: richText, enableGutter: false })
      ]
    }
  ) });
};
var FeatureGridBlock = ({ features, introContent }) => {
  return /* @__PURE__ */ jsxs("section", { className: "container", children: [
    introContent && /* @__PURE__ */ jsx(RichText, { className: "mx-auto mb-10 max-w-3xl text-center", data: introContent }),
    /* @__PURE__ */ jsx("div", { className: "grid gap-4 md:grid-cols-3", children: (features || []).map((feature, index) => /* @__PURE__ */ jsxs("article", { className: "rounded border border-border bg-card p-6", children: [
      feature.label && /* @__PURE__ */ jsx("p", { className: "mb-4 text-sm font-semibold text-muted-foreground", children: feature.label }),
      /* @__PURE__ */ jsx("h3", { className: "mb-3 text-xl font-semibold", children: feature.title }),
      feature.description && /* @__PURE__ */ jsx("p", { className: "text-sm leading-6 text-muted-foreground", children: feature.description })
    ] }, index)) })
  ] });
};
var StatsBlock = ({ introContent, stats }) => {
  return /* @__PURE__ */ jsxs("section", { className: "container", children: [
    introContent && /* @__PURE__ */ jsx(RichText, { className: "mx-auto mb-10 max-w-3xl text-center", data: introContent }),
    /* @__PURE__ */ jsx("div", { className: "grid gap-px overflow-hidden rounded border border-border bg-border md:grid-cols-4", children: (stats || []).map((stat, index) => /* @__PURE__ */ jsxs("div", { className: "bg-background p-6", children: [
      /* @__PURE__ */ jsx("div", { className: "text-3xl font-semibold", children: stat.value }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 font-medium", children: stat.label }),
      stat.description && /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm leading-6 text-muted-foreground", children: stat.description })
    ] }, index)) })
  ] });
};
var SplitMediaBlock = ({ links, media, mediaPosition, richText }) => {
  return /* @__PURE__ */ jsx("section", { className: "container", children: /* @__PURE__ */ jsxs("div", { className: "grid items-center gap-10 lg:grid-cols-2", children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        className: cn("order-2", {
          "lg:order-1": mediaPosition === "left",
          "lg:order-2": mediaPosition !== "left"
        }),
        children: hasMediaObject(media) && /* @__PURE__ */ jsx(
          Media,
          {
            className: "aspect-[4/3] overflow-hidden rounded border border-border object-cover",
            imgClassName: "h-full w-full object-cover",
            resource: media
          }
        )
      }
    ),
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: cn("order-1", {
          "lg:order-2": mediaPosition === "left",
          "lg:order-1": mediaPosition !== "left"
        }),
        children: [
          richText && /* @__PURE__ */ jsx(RichText, { data: richText, enableGutter: false }),
          Boolean(links?.length) && /* @__PURE__ */ jsx("div", { className: "mt-8 flex flex-wrap gap-3", children: links.map(({ link }, index) => /* @__PURE__ */ jsx(CMSLink, { ...link }, index)) })
        ]
      }
    )
  ] }) });
};
var ProcessBlock = ({ introContent, steps }) => {
  return /* @__PURE__ */ jsxs("section", { className: "container", children: [
    introContent && /* @__PURE__ */ jsx(RichText, { className: "mb-10 max-w-3xl", data: introContent }),
    /* @__PURE__ */ jsx("div", { className: "grid gap-4 md:grid-cols-3", children: (steps || []).map((step, index) => /* @__PURE__ */ jsxs("article", { className: "border-l border-border pl-5", children: [
      /* @__PURE__ */ jsx("div", { className: "mb-4 text-sm font-semibold text-muted-foreground", children: String(index + 1).padStart(2, "0") }),
      /* @__PURE__ */ jsx("h3", { className: "mb-3 text-xl font-semibold", children: step.title }),
      step.description && /* @__PURE__ */ jsx("p", { className: "text-sm leading-6 text-muted-foreground", children: step.description })
    ] }, index)) })
  ] });
};
var TestimonialBlock = ({ introContent, testimonials }) => {
  return /* @__PURE__ */ jsxs("section", { className: "container", children: [
    introContent && /* @__PURE__ */ jsx(RichText, { className: "mx-auto mb-10 max-w-3xl text-center", data: introContent }),
    /* @__PURE__ */ jsx("div", { className: "grid gap-4 md:grid-cols-2", children: (testimonials || []).map((testimonial, index) => /* @__PURE__ */ jsxs("figure", { className: "rounded border border-border bg-card p-6", children: [
      /* @__PURE__ */ jsxs("blockquote", { className: "text-lg leading-8", children: [
        "\u201C",
        testimonial.quote,
        "\u201D"
      ] }),
      /* @__PURE__ */ jsxs("figcaption", { className: "mt-6 flex items-center gap-3", children: [
        hasMediaObject(testimonial.avatar) && /* @__PURE__ */ jsx(
          Media,
          {
            className: "size-12 overflow-hidden rounded-full",
            imgClassName: "h-full w-full object-cover",
            resource: testimonial.avatar
          }
        ),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium", children: testimonial.authorName }),
          testimonial.authorRole && /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: testimonial.authorRole })
        ] })
      ] })
    ] }, index)) })
  ] });
};
var FAQBlock = ({ faqs, introContent }) => {
  return /* @__PURE__ */ jsx("section", { className: "container", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-10 lg:grid-cols-[0.8fr_1.2fr]", children: [
    introContent && /* @__PURE__ */ jsx(RichText, { data: introContent, enableGutter: false }),
    /* @__PURE__ */ jsx("div", { className: "divide-y divide-border border-y border-border", children: (faqs || []).map((faq, index) => /* @__PURE__ */ jsxs("div", { className: "py-6", children: [
      /* @__PURE__ */ jsx("h3", { className: "font-semibold", children: faq.question }),
      /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm leading-6 text-muted-foreground", children: faq.answer })
    ] }, index)) })
  ] }) });
};
var LogoCloudBlock = ({ introContent, logos }) => {
  return /* @__PURE__ */ jsxs("section", { className: "container", children: [
    introContent && /* @__PURE__ */ jsx(RichText, { className: "mx-auto mb-10 max-w-3xl text-center", data: introContent }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-px overflow-hidden rounded border border-border bg-border md:grid-cols-4", children: (logos || []).map((logo, index) => {
      const content = /* @__PURE__ */ jsx("div", { className: "flex h-28 items-center justify-center bg-background p-6", children: hasMediaObject(logo.logo) ? /* @__PURE__ */ jsx(
        Media,
        {
          className: "max-h-12 max-w-36",
          imgClassName: "max-h-12 w-auto object-contain",
          resource: logo.logo
        }
      ) : /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: logo.name }) });
      if (logo.url) {
        return /* @__PURE__ */ jsx("a", { href: logo.url, rel: "noreferrer", target: "_blank", children: content }, index);
      }
      return /* @__PURE__ */ jsx("div", { children: content }, index);
    }) })
  ] });
};
export {
  FAQBlock,
  FeatureGridBlock,
  LogoCloudBlock,
  ProcessBlock,
  SectionIntroBlock,
  SplitMediaBlock,
  StatsBlock,
  TestimonialBlock
};
