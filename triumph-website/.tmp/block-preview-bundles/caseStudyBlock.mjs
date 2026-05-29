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

// src/components/shadcn/case-study8.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var CaseStudy8 = ({ className, props }) => {
  return /* @__PURE__ */ jsx("section", { className: cn("py-32", className), children: /* @__PURE__ */ jsxs("div", { className: "container flex flex-col gap-12 lg:flex-row lg:gap-24", children: [
    /* @__PURE__ */ jsxs("article", { className: "mx-auto", children: [
      /* @__PURE__ */ jsx(
        "img",
        {
          src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg",
          alt: "placeholder",
          className: "mb-8 aspect-video w-full max-w-3xl rounded-lg border object-cover"
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "prose dark:prose-invert", children: [
        /* @__PURE__ */ jsx("h1", { children: "How Mercury uses shadcn/ui to build their design system" }),
        /* @__PURE__ */ jsx("p", { children: "Once upon a time, in a far-off land, there was a very lazy king who spent all day lounging on his throne. One day, his advisors came to him with a problem: the kingdom was running out of money." }),
        /* @__PURE__ */ jsx("h2", { children: "The King's Plan" }),
        /* @__PURE__ */ jsxs("p", { children: [
          "The king thought long and hard, and finally came up with",
          " ",
          /* @__PURE__ */ jsx("a", { href: "#", children: "a brilliant plan" }),
          ": he would tax the jokes in the kingdom."
        ] }),
        /* @__PURE__ */ jsx("blockquote", { children: "\u201CAfter all,\u201D he said, \u201Ceveryone enjoys a good joke, so it's only fair that they should pay for the privilege.\u201D" }),
        /* @__PURE__ */ jsx("h3", { children: "The Joke Tax" }),
        /* @__PURE__ */ jsx("p", { children: "The king's subjects were not amused. They grumbled and complained, but the king was firm:" }),
        /* @__PURE__ */ jsxs("ul", { children: [
          /* @__PURE__ */ jsx("li", { children: "1st level of puns: 5 gold coins" }),
          /* @__PURE__ */ jsx("li", { children: "2nd level of jokes: 10 gold coins" }),
          /* @__PURE__ */ jsx("li", { children: "3rd level of one-liners : 20 gold coins" })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "As a result, people stopped telling jokes, and the kingdom fell into a gloom. But there was one person who refused to let the king's foolishness get him down: a court jester named Jokester." }),
        /* @__PURE__ */ jsx("h3", { children: "Jokester's Revolt" }),
        /* @__PURE__ */ jsx("p", { children: "Jokester began sneaking into the castle in the middle of the night and leaving jokes all over the place: under the king's pillow, in his soup, even in the royal toilet. The king was furious, but he couldn't seem to stop Jokester." }),
        /* @__PURE__ */ jsx("p", { children: "And then, one day, the people of the kingdom discovered that the jokes left by Jokester were so funny that they couldn't help but laugh. And once they started laughing, they couldn't stop." }),
        /* @__PURE__ */ jsx("h3", { children: "The People's Rebellion" }),
        /* @__PURE__ */ jsx("p", { children: "The people of the kingdom, feeling uplifted by the laughter, started to tell jokes and puns again, and soon the entire kingdom was in on the joke." }),
        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("table", { children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("th", { children: "King's Treasury" }),
            /* @__PURE__ */ jsx("th", { children: "People's happiness" })
          ] }) }),
          /* @__PURE__ */ jsxs("tbody", { children: [
            /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("td", { children: "Empty" }),
              /* @__PURE__ */ jsx("td", { children: "Overflowing" })
            ] }),
            /* @__PURE__ */ jsxs("tr", { className: "m-0 border-t p-0 even:bg-muted", children: [
              /* @__PURE__ */ jsx("td", { children: "Modest" }),
              /* @__PURE__ */ jsx("td", { children: "Satisfied" })
            ] }),
            /* @__PURE__ */ jsxs("tr", { className: "m-0 border-t p-0 even:bg-muted", children: [
              /* @__PURE__ */ jsx("td", { children: "Full" }),
              /* @__PURE__ */ jsx("td", { children: "Ecstatic" })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx("p", { children: "The king, seeing how much happier his subjects were, realized the error of his ways and repealed the joke tax. Jokester was declared a hero, and the kingdom lived happily ever after." }),
        /* @__PURE__ */ jsx("p", { children: "The moral of the story is: never underestimate the power of a good laugh and always be careful of bad ideas." })
      ] })
    ] }),
    /* @__PURE__ */ jsx("aside", { className: "lg:max-w-[300px]", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-start rounded-lg border border-border bg-accent py-6 md:py-8", children: [
      /* @__PURE__ */ jsx("div", { className: "mb-8 px-6", children: /* @__PURE__ */ jsx(
        "img",
        {
          src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/company/fictional-company-logo-3.svg",
          alt: "placeholder",
          className: "max-h-8 w-full"
        }
      ) }),
      props.details?.map(
        (detail) => /* @__PURE__ */ jsxs("div", { className: "mb-5 px-6 last:mb-0", children: [
          /* @__PURE__ */ jsx("div", { className: "mb-2 text-xs font-semibold", children: detail.title }),
          /* @__PURE__ */ jsx("div", { className: "overflow-hidden text-xs text-muted-foreground md:text-sm", children: detail.desc })
        ] })
      )
    ] }) })
  ] }) });
};

// src/blocks/CaseStudyBlock/Component.tsx
var CaseStudyBlock = (props) => {
  return CaseStudy8({ className: "", props });
};
export {
  CaseStudyBlock
};
