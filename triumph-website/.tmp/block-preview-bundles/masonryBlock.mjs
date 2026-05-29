"use client";

// src/blocks/Masonry/MasonyComponent.tsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// block-preview-mock:gsap
var chain = new Proxy(function() {
}, { get: () => chain, apply: () => chain });
var gsap = chain;

// src/blocks/Masonry/MasonyComponent.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var useMedia = (queries, values, defaultValue) => {
  const get = () => values[queries.findIndex((q) => matchMedia(q).matches)] ?? defaultValue;
  const [value, setValue] = useState(get);
  useEffect(() => {
    const handler = () => setValue(get);
    queries.forEach((q) => matchMedia(q).addEventListener("change", handler));
    return () => queries.forEach((q) => matchMedia(q).removeEventListener("change", handler));
  }, [queries]);
  return value;
};
var useMeasure = () => {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
};
var preloadImages = async (urls) => {
  await Promise.all(
    urls.map(
      (src) => new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = img.onerror = () => resolve();
      })
    )
  );
};
var Masonry = ({
  items,
  ease = "power3.out",
  duration = 0.6,
  stagger = 0.05,
  animateFrom = "bottom",
  scaleOnHover = true,
  hoverScale = 0.95,
  blurToFocus = true,
  colorShiftOnHover = false
}) => {
  const columns = useMedia(
    ["(min-width:1500px)", "(min-width:1000px)", "(min-width:600px)", "(min-width:400px)"],
    [5, 4, 3, 2],
    1
  );
  const [containerRef, { width }] = useMeasure();
  const [imagesReady, setImagesReady] = useState(false);
  const getInitialPosition = (item) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return { x: item.x, y: item.y };
    let direction = animateFrom;
    if (animateFrom === "random") {
      const dirs = ["top", "bottom", "left", "right"];
      direction = dirs[Math.floor(Math.random() * dirs.length)];
    }
    switch (direction) {
      case "top":
        return { x: item.x, y: -200 };
      case "bottom":
        return { x: item.x, y: window.innerHeight + 200 };
      case "left":
        return { x: -200, y: item.y };
      case "right":
        return { x: window.innerWidth + 200, y: item.y };
      case "center":
        return {
          x: containerRect.width / 2 - item.w / 2,
          y: containerRect.height / 2 - item.h / 2
        };
      default:
        return { x: item.x, y: item.y + 100 };
    }
  };
  useEffect(() => {
    preloadImages(items.map((i) => i.img)).then(() => setImagesReady(true));
  }, [items]);
  const grid = useMemo(() => {
    if (!width) return [];
    const colHeights = new Array(columns).fill(0);
    const gap = 16;
    const totalGaps = (columns - 1) * gap;
    const columnWidth = (width - totalGaps) / columns;
    const map = items.map((child) => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = col * (columnWidth + gap);
      const height = child.height / 2;
      const y = colHeights[col];
      colHeights[col] += height + gap;
      return { ...child, x, y, w: columnWidth, h: height };
    });
    containerRef.current.style.height = Math.max(...colHeights) + "px";
    return map;
  }, [columns, items, width]);
  const hasMounted = useRef(false);
  useLayoutEffect(() => {
    if (!imagesReady) return;
    grid.forEach((item, index) => {
      const selector = `[data-key="${item.id}"]`;
      const animProps = { x: item.x, y: item.y, width: item.w, height: item.h };
      if (!hasMounted.current) {
        const start = getInitialPosition(item);
        gsap.fromTo(
          selector,
          {
            opacity: 0,
            x: start.x,
            y: start.y,
            width: item.w,
            height: item.h,
            ...blurToFocus && { filter: "blur(10px)" }
          },
          {
            opacity: 1,
            ...animProps,
            ...blurToFocus && { filter: "blur(0px)" },
            duration: 0.8,
            ease: "power3.out",
            delay: index * stagger
          }
        );
      } else {
        gsap.to(selector, {
          ...animProps,
          duration,
          ease,
          overwrite: "auto"
        });
      }
    });
    hasMounted.current = true;
  }, [grid, imagesReady, stagger, animateFrom, blurToFocus, duration, ease]);
  const handleMouseEnter = (id, element) => {
    if (scaleOnHover) {
      gsap.to(`[data-key="${id}"]`, {
        scale: hoverScale,
        duration: 0.3,
        ease: "power2.out"
      });
    }
    if (colorShiftOnHover) {
      const overlay = element.querySelector(".color-overlay");
      if (overlay) gsap.to(overlay, { opacity: 0.3, duration: 0.3 });
    }
    const text = element.querySelector("p");
    if (text) gsap.to(text, { opacity: 1 });
  };
  const handleMouseLeave = (id, element) => {
    if (scaleOnHover) {
      gsap.to(`[data-key="${id}"]`, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out"
      });
    }
    if (colorShiftOnHover) {
      const overlay = element.querySelector(".color-overlay");
      if (overlay) gsap.to(overlay, { opacity: 0, duration: 0.3 });
    }
    const text = element.querySelector("p");
    if (text) gsap.to(text, { opacity: 0 });
  };
  return /* @__PURE__ */ jsx("div", { ref: containerRef, className: "relative w-full h-full overflow-hidden", children: grid.map((item) => /* @__PURE__ */ jsx(
    "div",
    {
      "data-key": item.id,
      className: "absolute box-content ",
      style: { willChange: "transform, width, height, opacity" },
      onClick: () => window.open(item.url, "_blank", "noopener"),
      onMouseEnter: (e) => handleMouseEnter(item.id, e.currentTarget),
      onMouseLeave: (e) => handleMouseLeave(item.id, e.currentTarget),
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          className: "relative w-full h-full bg-cover bg-center rounded-[10px] overflow-hidden shadow-[0px_10px_50px_-10px_rgba(0,0,0,0.2)] text-[10px]",
          style: { backgroundImage: `url(${item.img})` },
          children: [
            colorShiftOnHover && /* @__PURE__ */ jsx("div", { className: "color-overlay absolute inset-0 rounded-[10px] bg-gradient-to-tr from-pink-500/50 to-sky-500/50 opacity-0 pointer-events-none" }),
            item.caption && /* @__PURE__ */ jsx("p", { className: "opacity-0 text-lg text-left bottom-0 p-4 pb-6 absolute w-full bg-black/20 backdrop-blur-xs font-bold", children: item.caption })
          ]
        }
      )
    },
    item.id
  )) });
};
var MasonyComponent_default = Masonry;

// src/blocks/Masonry/Component.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var MasonryBlock = (props) => {
  const {
    media
  } = props;
  return /* @__PURE__ */ jsx2("div", { className: "container flex h-auto", children: /* @__PURE__ */ jsx2(
    MasonyComponent_default,
    {
      animateFrom: "random",
      colorShiftOnHover: true,
      items: media.map((media2, i) => {
        return typeof media2 != "string" ? { img: media2.url, caption: media2.alt, height: media2.height / 2, id: media2.filename || i.toFixed(), url: media2.url } : null;
      }).filter((el) => el != null)
    }
  ) });
};
export {
  MasonryBlock
};
