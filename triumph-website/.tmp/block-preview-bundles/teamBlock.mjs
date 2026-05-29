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

// block-preview-mock:media
import React from "react";
var srcFrom = (props) => {
  if (typeof props.src === "string") return props.src;
  if (typeof props.resource === "string") return props.resource;
  return props.resource?.url || props.src?.src || "";
};
function Media(props) {
  const src = srcFrom(props);
  return React.createElement("img", {
    alt: props.alt || props.resource?.alt || "",
    className: props.imgClassName || props.className,
    src
  });
}

// block-preview-mock:logo
import React2 from "react";
function Logo(props) {
  return React2.createElement("div", { className: props.className }, "Triumph");
}

// src/blocks/TeamBlock/Component.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var TeamBlock = (props) => {
  const {
    mandates
  } = props;
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "relative items-center justify-center text-white bg-size-[4200] bg-position-[50%50%]",
      style: { backgroundImage: 'url("/scren_texture.svg")' },
      children: /* @__PURE__ */ jsxs("div", { className: "container flex flex-col gap-20", children: [
        /* @__PURE__ */ jsx(Logo, { className: "mx-auto my-4 w-100" }),
        mandates && mandates.map((mandate, i) => {
          return /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("h2", { className: "text-center mbe-10", children: [
              /* @__PURE__ */ jsx("div", { className: "text-center text-4xl font-bold", children: i == 0 ? "Meet the board" : "Mandatul" }),
              /* @__PURE__ */ jsxs("div", { className: "text-lg text-accent font-bold", children: [
                "\u201C",
                mandate.year,
                " - ",
                (mandate.year || 2026) + 1,
                "\u201D"
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 justify-items-center mx-auto", children: mandate.members && mandate.members.map((member, i2) => {
              return /* @__PURE__ */ jsxs("div", { className: "flex flex-col relative", children: [
                /* @__PURE__ */ jsx(
                  Media,
                  {
                    imgClassName: cn("border border-border rounded-[0.25em] w-75 h-100 object-cover relative"),
                    resource: member.picture || "/profile_picture.png"
                  }
                ),
                /* @__PURE__ */ jsxs("div", { className: "bottom-0  m-2 absolute", children: [
                  /* @__PURE__ */ jsx("p", { className: "italic", children: member.role }),
                  /* @__PURE__ */ jsx("p", { className: "text-4xl font-bold", children: member.name })
                ] })
              ] }, i2);
            }) })
          ] }, i);
        })
      ] })
    }
  );
};
export {
  TeamBlock
};
