"use client";

// block-preview-mock:next-navigation
function useRouter() {
  return { push() {
  } };
}

// src/blocks/Form/Component.tsx
import { useCallback, useState } from "react";

// block-preview-mock:react-hook-form
import React from "react";
function useForm() {
  return {
    control: {},
    formState: { errors: {} },
    handleSubmit: () => (event) => event?.preventDefault?.(),
    register: () => ({})
  };
}
function useFormContext() {
  return {
    control: {},
    formState: { errors: {} },
    register: () => ({})
  };
}
function Controller(props) {
  return props.render?.({ field: { onChange() {
  }, value: "" } }) || null;
}
function FormProvider(props) {
  return React.createElement(React.Fragment, null, props.children);
}

// block-preview-mock:rich-text
import React2 from "react";
var renderNode = (node, index) => {
  if (!node) return null;
  if (node.type === "text") return node.text || "";
  const children = Array.isArray(node.children) ? node.children.map(renderNode) : null;
  if (node.type === "heading") return React2.createElement(node.tag || "h2", { key: index }, children);
  if (node.type === "paragraph") return React2.createElement("p", { key: index }, children);
  if (node.type === "link") return React2.createElement("a", { key: index, href: node.fields?.url || "#" }, children);
  return React2.createElement("div", { key: index }, children);
};
function RichText({ className, data }) {
  return React2.createElement("div", { className }, data?.root?.children?.map(renderNode));
}

// block-preview-mock:ui-control
import React3 from "react";
function Button(props) {
  const Tag = props.asChild ? React3.Fragment : "button";
  if (props.asChild) return React3.createElement(React3.Fragment, null, props.children);
  return React3.createElement(Tag, { className: props.className, type: props.type }, props.children);
}
function Checkbox(props) {
  return React3.createElement("input", { className: props.className, type: "checkbox" });
}
function Input(props) {
  return React3.createElement("input", { className: props.className, placeholder: props.placeholder });
}
function Label(props) {
  return React3.createElement("label", { className: props.className }, props.children);
}
function Select(props) {
  return React3.createElement("select", { className: props.className }, props.children);
}
function SelectContent(props) {
  return React3.createElement(React3.Fragment, null, props.children);
}
function SelectItem(props) {
  return React3.createElement("option", { value: props.value }, props.children);
}
function SelectTrigger(props) {
  return React3.createElement("div", { className: props.className }, props.children);
}
function SelectValue(props) {
  return React3.createElement("span", null, props.placeholder);
}
function Textarea(props) {
  return React3.createElement("textarea", { className: props.className, placeholder: props.placeholder });
}

// src/blocks/Form/Error/index.tsx
import { jsx } from "react/jsx-runtime";
var Error = ({ name }) => {
  const {
    formState: { errors }
  } = useFormContext();
  return /* @__PURE__ */ jsx("div", { className: "mt-2 text-red-500 text-sm", children: errors[name]?.message || "This field is required" });
};

// src/blocks/Form/Width/index.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var Width = ({ children, className, width }) => {
  return /* @__PURE__ */ jsx2("div", { className, style: { maxWidth: width ? `${width}%` : void 0 }, children });
};

// src/blocks/Form/Checkbox/index.tsx
import { jsx as jsx3, jsxs } from "react/jsx-runtime";
var Checkbox2 = ({ name, defaultValue, errors, label, register, required, width }) => {
  const props = register(name, { required });
  const { setValue } = useFormContext();
  return /* @__PURE__ */ jsxs(Width, { width, children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx3(
        Checkbox,
        {
          defaultChecked: defaultValue,
          id: name,
          ...props,
          onCheckedChange: (checked) => {
            setValue(props.name, checked);
          }
        }
      ),
      /* @__PURE__ */ jsxs(Label, { htmlFor: name, children: [
        required && /* @__PURE__ */ jsxs("span", { className: "required", children: [
          "* ",
          /* @__PURE__ */ jsx3("span", { className: "sr-only", children: "(required)" })
        ] }),
        label
      ] })
    ] }),
    errors[name] && /* @__PURE__ */ jsx3(Error, { name })
  ] });
};

// src/blocks/Form/Country/options.ts
var countryOptions = [
  {
    label: "Afghanistan",
    value: "AF"
  },
  {
    label: "\xC5land Islands",
    value: "AX"
  },
  {
    label: "Albania",
    value: "AL"
  },
  {
    label: "Algeria",
    value: "DZ"
  },
  {
    label: "American Samoa",
    value: "AS"
  },
  {
    label: "Andorra",
    value: "AD"
  },
  {
    label: "Angola",
    value: "AO"
  },
  {
    label: "Anguilla",
    value: "AI"
  },
  {
    label: "Antarctica",
    value: "AQ"
  },
  {
    label: "Antigua and Barbuda",
    value: "AG"
  },
  {
    label: "Argentina",
    value: "AR"
  },
  {
    label: "Armenia",
    value: "AM"
  },
  {
    label: "Aruba",
    value: "AW"
  },
  {
    label: "Australia",
    value: "AU"
  },
  {
    label: "Austria",
    value: "AT"
  },
  {
    label: "Azerbaijan",
    value: "AZ"
  },
  {
    label: "Bahamas",
    value: "BS"
  },
  {
    label: "Bahrain",
    value: "BH"
  },
  {
    label: "Bangladesh",
    value: "BD"
  },
  {
    label: "Barbados",
    value: "BB"
  },
  {
    label: "Belarus",
    value: "BY"
  },
  {
    label: "Belgium",
    value: "BE"
  },
  {
    label: "Belize",
    value: "BZ"
  },
  {
    label: "Benin",
    value: "BJ"
  },
  {
    label: "Bermuda",
    value: "BM"
  },
  {
    label: "Bhutan",
    value: "BT"
  },
  {
    label: "Bolivia",
    value: "BO"
  },
  {
    label: "Bosnia and Herzegovina",
    value: "BA"
  },
  {
    label: "Botswana",
    value: "BW"
  },
  {
    label: "Bouvet Island",
    value: "BV"
  },
  {
    label: "Brazil",
    value: "BR"
  },
  {
    label: "British Indian Ocean Territory",
    value: "IO"
  },
  {
    label: "Brunei Darussalam",
    value: "BN"
  },
  {
    label: "Bulgaria",
    value: "BG"
  },
  {
    label: "Burkina Faso",
    value: "BF"
  },
  {
    label: "Burundi",
    value: "BI"
  },
  {
    label: "Cambodia",
    value: "KH"
  },
  {
    label: "Cameroon",
    value: "CM"
  },
  {
    label: "Canada",
    value: "CA"
  },
  {
    label: "Cape Verde",
    value: "CV"
  },
  {
    label: "Cayman Islands",
    value: "KY"
  },
  {
    label: "Central African Republic",
    value: "CF"
  },
  {
    label: "Chad",
    value: "TD"
  },
  {
    label: "Chile",
    value: "CL"
  },
  {
    label: "China",
    value: "CN"
  },
  {
    label: "Christmas Island",
    value: "CX"
  },
  {
    label: "Cocos (Keeling) Islands",
    value: "CC"
  },
  {
    label: "Colombia",
    value: "CO"
  },
  {
    label: "Comoros",
    value: "KM"
  },
  {
    label: "Congo",
    value: "CG"
  },
  {
    label: "Congo, The Democratic Republic of the",
    value: "CD"
  },
  {
    label: "Cook Islands",
    value: "CK"
  },
  {
    label: "Costa Rica",
    value: "CR"
  },
  {
    label: "Cote D'Ivoire",
    value: "CI"
  },
  {
    label: "Croatia",
    value: "HR"
  },
  {
    label: "Cuba",
    value: "CU"
  },
  {
    label: "Cyprus",
    value: "CY"
  },
  {
    label: "Czech Republic",
    value: "CZ"
  },
  {
    label: "Denmark",
    value: "DK"
  },
  {
    label: "Djibouti",
    value: "DJ"
  },
  {
    label: "Dominica",
    value: "DM"
  },
  {
    label: "Dominican Republic",
    value: "DO"
  },
  {
    label: "Ecuador",
    value: "EC"
  },
  {
    label: "Egypt",
    value: "EG"
  },
  {
    label: "El Salvador",
    value: "SV"
  },
  {
    label: "Equatorial Guinea",
    value: "GQ"
  },
  {
    label: "Eritrea",
    value: "ER"
  },
  {
    label: "Estonia",
    value: "EE"
  },
  {
    label: "Ethiopia",
    value: "ET"
  },
  {
    label: "Falkland Islands (Malvinas)",
    value: "FK"
  },
  {
    label: "Faroe Islands",
    value: "FO"
  },
  {
    label: "Fiji",
    value: "FJ"
  },
  {
    label: "Finland",
    value: "FI"
  },
  {
    label: "France",
    value: "FR"
  },
  {
    label: "French Guiana",
    value: "GF"
  },
  {
    label: "French Polynesia",
    value: "PF"
  },
  {
    label: "French Southern Territories",
    value: "TF"
  },
  {
    label: "Gabon",
    value: "GA"
  },
  {
    label: "Gambia",
    value: "GM"
  },
  {
    label: "Georgia",
    value: "GE"
  },
  {
    label: "Germany",
    value: "DE"
  },
  {
    label: "Ghana",
    value: "GH"
  },
  {
    label: "Gibraltar",
    value: "GI"
  },
  {
    label: "Greece",
    value: "GR"
  },
  {
    label: "Greenland",
    value: "GL"
  },
  {
    label: "Grenada",
    value: "GD"
  },
  {
    label: "Guadeloupe",
    value: "GP"
  },
  {
    label: "Guam",
    value: "GU"
  },
  {
    label: "Guatemala",
    value: "GT"
  },
  {
    label: "Guernsey",
    value: "GG"
  },
  {
    label: "Guinea",
    value: "GN"
  },
  {
    label: "Guinea-Bissau",
    value: "GW"
  },
  {
    label: "Guyana",
    value: "GY"
  },
  {
    label: "Haiti",
    value: "HT"
  },
  {
    label: "Heard Island and Mcdonald Islands",
    value: "HM"
  },
  {
    label: "Holy See (Vatican City State)",
    value: "VA"
  },
  {
    label: "Honduras",
    value: "HN"
  },
  {
    label: "Hong Kong",
    value: "HK"
  },
  {
    label: "Hungary",
    value: "HU"
  },
  {
    label: "Iceland",
    value: "IS"
  },
  {
    label: "India",
    value: "IN"
  },
  {
    label: "Indonesia",
    value: "ID"
  },
  {
    label: "Iran, Islamic Republic Of",
    value: "IR"
  },
  {
    label: "Iraq",
    value: "IQ"
  },
  {
    label: "Ireland",
    value: "IE"
  },
  {
    label: "Isle of Man",
    value: "IM"
  },
  {
    label: "Israel",
    value: "IL"
  },
  {
    label: "Italy",
    value: "IT"
  },
  {
    label: "Jamaica",
    value: "JM"
  },
  {
    label: "Japan",
    value: "JP"
  },
  {
    label: "Jersey",
    value: "JE"
  },
  {
    label: "Jordan",
    value: "JO"
  },
  {
    label: "Kazakhstan",
    value: "KZ"
  },
  {
    label: "Kenya",
    value: "KE"
  },
  {
    label: "Kiribati",
    value: "KI"
  },
  {
    label: "Democratic People's Republic of Korea",
    value: "KP"
  },
  {
    label: "Korea, Republic of",
    value: "KR"
  },
  {
    label: "Kosovo",
    value: "XK"
  },
  {
    label: "Kuwait",
    value: "KW"
  },
  {
    label: "Kyrgyzstan",
    value: "KG"
  },
  {
    label: "Lao People's Democratic Republic",
    value: "LA"
  },
  {
    label: "Latvia",
    value: "LV"
  },
  {
    label: "Lebanon",
    value: "LB"
  },
  {
    label: "Lesotho",
    value: "LS"
  },
  {
    label: "Liberia",
    value: "LR"
  },
  {
    label: "Libyan Arab Jamahiriya",
    value: "LY"
  },
  {
    label: "Liechtenstein",
    value: "LI"
  },
  {
    label: "Lithuania",
    value: "LT"
  },
  {
    label: "Luxembourg",
    value: "LU"
  },
  {
    label: "Macao",
    value: "MO"
  },
  {
    label: "Macedonia, The Former Yugoslav Republic of",
    value: "MK"
  },
  {
    label: "Madagascar",
    value: "MG"
  },
  {
    label: "Malawi",
    value: "MW"
  },
  {
    label: "Malaysia",
    value: "MY"
  },
  {
    label: "Maldives",
    value: "MV"
  },
  {
    label: "Mali",
    value: "ML"
  },
  {
    label: "Malta",
    value: "MT"
  },
  {
    label: "Marshall Islands",
    value: "MH"
  },
  {
    label: "Martinique",
    value: "MQ"
  },
  {
    label: "Mauritania",
    value: "MR"
  },
  {
    label: "Mauritius",
    value: "MU"
  },
  {
    label: "Mayotte",
    value: "YT"
  },
  {
    label: "Mexico",
    value: "MX"
  },
  {
    label: "Micronesia, Federated States of",
    value: "FM"
  },
  {
    label: "Moldova, Republic of",
    value: "MD"
  },
  {
    label: "Monaco",
    value: "MC"
  },
  {
    label: "Mongolia",
    value: "MN"
  },
  {
    label: "Montenegro",
    value: "ME"
  },
  {
    label: "Montserrat",
    value: "MS"
  },
  {
    label: "Morocco",
    value: "MA"
  },
  {
    label: "Mozambique",
    value: "MZ"
  },
  {
    label: "Myanmar",
    value: "MM"
  },
  {
    label: "Namibia",
    value: "NA"
  },
  {
    label: "Nauru",
    value: "NR"
  },
  {
    label: "Nepal",
    value: "NP"
  },
  {
    label: "Netherlands",
    value: "NL"
  },
  {
    label: "Netherlands Antilles",
    value: "AN"
  },
  {
    label: "New Caledonia",
    value: "NC"
  },
  {
    label: "New Zealand",
    value: "NZ"
  },
  {
    label: "Nicaragua",
    value: "NI"
  },
  {
    label: "Niger",
    value: "NE"
  },
  {
    label: "Nigeria",
    value: "NG"
  },
  {
    label: "Niue",
    value: "NU"
  },
  {
    label: "Norfolk Island",
    value: "NF"
  },
  {
    label: "Northern Mariana Islands",
    value: "MP"
  },
  {
    label: "Norway",
    value: "NO"
  },
  {
    label: "Oman",
    value: "OM"
  },
  {
    label: "Pakistan",
    value: "PK"
  },
  {
    label: "Palau",
    value: "PW"
  },
  {
    label: "Palestinian Territory, Occupied",
    value: "PS"
  },
  {
    label: "Panama",
    value: "PA"
  },
  {
    label: "Papua New Guinea",
    value: "PG"
  },
  {
    label: "Paraguay",
    value: "PY"
  },
  {
    label: "Peru",
    value: "PE"
  },
  {
    label: "Philippines",
    value: "PH"
  },
  {
    label: "Pitcairn",
    value: "PN"
  },
  {
    label: "Poland",
    value: "PL"
  },
  {
    label: "Portugal",
    value: "PT"
  },
  {
    label: "Puerto Rico",
    value: "PR"
  },
  {
    label: "Qatar",
    value: "QA"
  },
  {
    label: "Reunion",
    value: "RE"
  },
  {
    label: "Romania",
    value: "RO"
  },
  {
    label: "Russian Federation",
    value: "RU"
  },
  {
    label: "Rwanda",
    value: "RW"
  },
  {
    label: "Saint Helena",
    value: "SH"
  },
  {
    label: "Saint Kitts and Nevis",
    value: "KN"
  },
  {
    label: "Saint Lucia",
    value: "LC"
  },
  {
    label: "Saint Pierre and Miquelon",
    value: "PM"
  },
  {
    label: "Saint Vincent and the Grenadines",
    value: "VC"
  },
  {
    label: "Samoa",
    value: "WS"
  },
  {
    label: "San Marino",
    value: "SM"
  },
  {
    label: "Sao Tome and Principe",
    value: "ST"
  },
  {
    label: "Saudi Arabia",
    value: "SA"
  },
  {
    label: "Senegal",
    value: "SN"
  },
  {
    label: "Serbia",
    value: "RS"
  },
  {
    label: "Seychelles",
    value: "SC"
  },
  {
    label: "Sierra Leone",
    value: "SL"
  },
  {
    label: "Singapore",
    value: "SG"
  },
  {
    label: "Slovakia",
    value: "SK"
  },
  {
    label: "Slovenia",
    value: "SI"
  },
  {
    label: "Solomon Islands",
    value: "SB"
  },
  {
    label: "Somalia",
    value: "SO"
  },
  {
    label: "South Africa",
    value: "ZA"
  },
  {
    label: "South Georgia and the South Sandwich Islands",
    value: "GS"
  },
  {
    label: "Spain",
    value: "ES"
  },
  {
    label: "Sri Lanka",
    value: "LK"
  },
  {
    label: "Sudan",
    value: "SD"
  },
  {
    label: "Suriname",
    value: "SR"
  },
  {
    label: "Svalbard and Jan Mayen",
    value: "SJ"
  },
  {
    label: "Swaziland",
    value: "SZ"
  },
  {
    label: "Sweden",
    value: "SE"
  },
  {
    label: "Switzerland",
    value: "CH"
  },
  {
    label: "Syrian Arab Republic",
    value: "SY"
  },
  {
    label: "Taiwan",
    value: "TW"
  },
  {
    label: "Tajikistan",
    value: "TJ"
  },
  {
    label: "Tanzania, United Republic of",
    value: "TZ"
  },
  {
    label: "Thailand",
    value: "TH"
  },
  {
    label: "Timor-Leste",
    value: "TL"
  },
  {
    label: "Togo",
    value: "TG"
  },
  {
    label: "Tokelau",
    value: "TK"
  },
  {
    label: "Tonga",
    value: "TO"
  },
  {
    label: "Trinidad and Tobago",
    value: "TT"
  },
  {
    label: "Tunisia",
    value: "TN"
  },
  {
    label: "Turkey",
    value: "TR"
  },
  {
    label: "Turkmenistan",
    value: "TM"
  },
  {
    label: "Turks and Caicos Islands",
    value: "TC"
  },
  {
    label: "Tuvalu",
    value: "TV"
  },
  {
    label: "Uganda",
    value: "UG"
  },
  {
    label: "Ukraine",
    value: "UA"
  },
  {
    label: "United Arab Emirates",
    value: "AE"
  },
  {
    label: "United Kingdom",
    value: "GB"
  },
  {
    label: "United States",
    value: "US"
  },
  {
    label: "United States Minor Outlying Islands",
    value: "UM"
  },
  {
    label: "Uruguay",
    value: "UY"
  },
  {
    label: "Uzbekistan",
    value: "UZ"
  },
  {
    label: "Vanuatu",
    value: "VU"
  },
  {
    label: "Venezuela",
    value: "VE"
  },
  {
    label: "Viet Nam",
    value: "VN"
  },
  {
    label: "Virgin Islands, British",
    value: "VG"
  },
  {
    label: "Virgin Islands, U.S.",
    value: "VI"
  },
  {
    label: "Wallis and Futuna",
    value: "WF"
  },
  {
    label: "Western Sahara",
    value: "EH"
  },
  {
    label: "Yemen",
    value: "YE"
  },
  {
    label: "Zambia",
    value: "ZM"
  },
  {
    label: "Zimbabwe",
    value: "ZW"
  }
];

// src/blocks/Form/Country/index.tsx
import { jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
var Country = ({ name, control, errors, label, required, width }) => {
  return /* @__PURE__ */ jsxs2(Width, { width, children: [
    /* @__PURE__ */ jsxs2(Label, { className: "", htmlFor: name, children: [
      label,
      required && /* @__PURE__ */ jsxs2("span", { className: "required", children: [
        "* ",
        /* @__PURE__ */ jsx4("span", { className: "sr-only", children: "(required)" })
      ] })
    ] }),
    /* @__PURE__ */ jsx4(
      Controller,
      {
        control,
        defaultValue: "",
        name,
        render: ({ field: { onChange, value } }) => {
          const controlledValue = countryOptions.find((t) => t.value === value);
          return /* @__PURE__ */ jsxs2(Select, { onValueChange: (val) => onChange(val), value: controlledValue?.value, children: [
            /* @__PURE__ */ jsx4(SelectTrigger, { className: "w-full", id: name, children: /* @__PURE__ */ jsx4(SelectValue, { placeholder: label }) }),
            /* @__PURE__ */ jsx4(SelectContent, { children: countryOptions.map(({ label: label2, value: value2 }) => {
              return /* @__PURE__ */ jsx4(SelectItem, { value: value2, children: label2 }, value2);
            }) })
          ] });
        },
        rules: { required }
      }
    ),
    errors[name] && /* @__PURE__ */ jsx4(Error, { name })
  ] });
};

// src/blocks/Form/Email/index.tsx
import { jsx as jsx5, jsxs as jsxs3 } from "react/jsx-runtime";
var Email = ({ name, defaultValue, errors, label, register, required, width }) => {
  return /* @__PURE__ */ jsxs3(Width, { width, children: [
    /* @__PURE__ */ jsxs3(Label, { htmlFor: name, children: [
      label,
      required && /* @__PURE__ */ jsxs3("span", { className: "required", children: [
        "* ",
        /* @__PURE__ */ jsx5("span", { className: "sr-only", children: "(required)" })
      ] })
    ] }),
    /* @__PURE__ */ jsx5(
      Input,
      {
        defaultValue,
        id: name,
        type: "text",
        ...register(name, { pattern: /^\S[^\s@]*@\S+$/, required })
      }
    ),
    errors[name] && /* @__PURE__ */ jsx5(Error, { name })
  ] });
};

// src/blocks/Form/Message/index.tsx
import { jsx as jsx6 } from "react/jsx-runtime";
var Message = ({ message }) => {
  return /* @__PURE__ */ jsx6(Width, { className: "my-12", width: "100", children: message && /* @__PURE__ */ jsx6(RichText, { data: message }) });
};

// src/blocks/Form/Number/index.tsx
import { jsx as jsx7, jsxs as jsxs4 } from "react/jsx-runtime";
var Number = ({ name, defaultValue, errors, label, register, required, width }) => {
  return /* @__PURE__ */ jsxs4(Width, { width, children: [
    /* @__PURE__ */ jsxs4(Label, { htmlFor: name, children: [
      label,
      required && /* @__PURE__ */ jsxs4("span", { className: "required", children: [
        "* ",
        /* @__PURE__ */ jsx7("span", { className: "sr-only", children: "(required)" })
      ] })
    ] }),
    /* @__PURE__ */ jsx7(
      Input,
      {
        defaultValue,
        id: name,
        type: "number",
        ...register(name, { required })
      }
    ),
    errors[name] && /* @__PURE__ */ jsx7(Error, { name })
  ] });
};

// src/blocks/Form/Select/index.tsx
import { jsx as jsx8, jsxs as jsxs5 } from "react/jsx-runtime";
var Select2 = ({ name, control, errors, label, options, required, width, defaultValue }) => {
  return /* @__PURE__ */ jsxs5(Width, { width, children: [
    /* @__PURE__ */ jsxs5(Label, { htmlFor: name, children: [
      label,
      required && /* @__PURE__ */ jsxs5("span", { className: "required", children: [
        "* ",
        /* @__PURE__ */ jsx8("span", { className: "sr-only", children: "(required)" })
      ] })
    ] }),
    /* @__PURE__ */ jsx8(
      Controller,
      {
        control,
        defaultValue,
        name,
        render: ({ field: { onChange, value } }) => {
          const controlledValue = options.find((t) => t.value === value);
          return /* @__PURE__ */ jsxs5(Select, { onValueChange: (val) => onChange(val), value: controlledValue?.value, children: [
            /* @__PURE__ */ jsx8(SelectTrigger, { className: "w-full", id: name, children: /* @__PURE__ */ jsx8(SelectValue, { placeholder: label }) }),
            /* @__PURE__ */ jsx8(SelectContent, { children: options.map(({ label: label2, value: value2 }) => {
              return /* @__PURE__ */ jsx8(SelectItem, { value: value2, children: label2 }, value2);
            }) })
          ] });
        },
        rules: { required }
      }
    ),
    errors[name] && /* @__PURE__ */ jsx8(Error, { name })
  ] });
};

// src/blocks/Form/State/options.ts
var stateOptions = [
  { label: "Alabama", value: "AL" },
  { label: "Alaska", value: "AK" },
  { label: "Arizona", value: "AZ" },
  { label: "Arkansas", value: "AR" },
  { label: "California", value: "CA" },
  { label: "Colorado", value: "CO" },
  { label: "Connecticut", value: "CT" },
  { label: "Delaware", value: "DE" },
  { label: "Florida", value: "FL" },
  { label: "Georgia", value: "GA" },
  { label: "Hawaii", value: "HI" },
  { label: "Idaho", value: "ID" },
  { label: "Illinois", value: "IL" },
  { label: "Indiana", value: "IN" },
  { label: "Iowa", value: "IA" },
  { label: "Kansas", value: "KS" },
  { label: "Kentucky", value: "KY" },
  { label: "Louisiana", value: "LA" },
  { label: "Maine", value: "ME" },
  { label: "Maryland", value: "MD" },
  { label: "Massachusetts", value: "MA" },
  { label: "Michigan", value: "MI" },
  { label: "Minnesota", value: "MN" },
  { label: "Mississippi", value: "MS" },
  { label: "Missouri", value: "MO" },
  { label: "Montana", value: "MT" },
  { label: "Nebraska", value: "NE" },
  { label: "Nevada", value: "NV" },
  { label: "New Hampshire", value: "NH" },
  { label: "New Jersey", value: "NJ" },
  { label: "New Mexico", value: "NM" },
  { label: "New York", value: "NY" },
  { label: "North Carolina", value: "NC" },
  { label: "North Dakota", value: "ND" },
  { label: "Ohio", value: "OH" },
  { label: "Oklahoma", value: "OK" },
  { label: "Oregon", value: "OR" },
  { label: "Pennsylvania", value: "PA" },
  { label: "Rhode Island", value: "RI" },
  { label: "South Carolina", value: "SC" },
  { label: "South Dakota", value: "SD" },
  { label: "Tennessee", value: "TN" },
  { label: "Texas", value: "TX" },
  { label: "Utah", value: "UT" },
  { label: "Vermont", value: "VT" },
  { label: "Virginia", value: "VA" },
  { label: "Washington", value: "WA" },
  { label: "West Virginia", value: "WV" },
  { label: "Wisconsin", value: "WI" },
  { label: "Wyoming", value: "WY" }
];

// src/blocks/Form/State/index.tsx
import { jsx as jsx9, jsxs as jsxs6 } from "react/jsx-runtime";
var State = ({ name, control, errors, label, required, width }) => {
  return /* @__PURE__ */ jsxs6(Width, { width, children: [
    /* @__PURE__ */ jsxs6(Label, { htmlFor: name, children: [
      label,
      required && /* @__PURE__ */ jsxs6("span", { className: "required", children: [
        "* ",
        /* @__PURE__ */ jsx9("span", { className: "sr-only", children: "(required)" })
      ] })
    ] }),
    /* @__PURE__ */ jsx9(
      Controller,
      {
        control,
        defaultValue: "",
        name,
        render: ({ field: { onChange, value } }) => {
          const controlledValue = stateOptions.find((t) => t.value === value);
          return /* @__PURE__ */ jsxs6(Select, { onValueChange: (val) => onChange(val), value: controlledValue?.value, children: [
            /* @__PURE__ */ jsx9(SelectTrigger, { className: "w-full", id: name, children: /* @__PURE__ */ jsx9(SelectValue, { placeholder: label }) }),
            /* @__PURE__ */ jsx9(SelectContent, { children: stateOptions.map(({ label: label2, value: value2 }) => {
              return /* @__PURE__ */ jsx9(SelectItem, { value: value2, children: label2 }, value2);
            }) })
          ] });
        },
        rules: { required }
      }
    ),
    errors[name] && /* @__PURE__ */ jsx9(Error, { name })
  ] });
};

// src/blocks/Form/Text/index.tsx
import { jsx as jsx10, jsxs as jsxs7 } from "react/jsx-runtime";
var Text = ({ name, defaultValue, errors, label, register, required, width }) => {
  return /* @__PURE__ */ jsxs7(Width, { width, children: [
    /* @__PURE__ */ jsxs7(Label, { htmlFor: name, children: [
      label,
      required && /* @__PURE__ */ jsxs7("span", { className: "required", children: [
        "* ",
        /* @__PURE__ */ jsx10("span", { className: "sr-only", children: "(required)" })
      ] })
    ] }),
    /* @__PURE__ */ jsx10(Input, { defaultValue, id: name, type: "text", ...register(name, { required }) }),
    errors[name] && /* @__PURE__ */ jsx10(Error, { name })
  ] });
};

// src/blocks/Form/Textarea/index.tsx
import { jsx as jsx11, jsxs as jsxs8 } from "react/jsx-runtime";
var Textarea2 = ({ name, defaultValue, errors, label, register, required, rows = 3, width }) => {
  return /* @__PURE__ */ jsxs8(Width, { width, children: [
    /* @__PURE__ */ jsxs8(Label, { htmlFor: name, children: [
      label,
      required && /* @__PURE__ */ jsxs8("span", { className: "required", children: [
        "* ",
        /* @__PURE__ */ jsx11("span", { className: "sr-only", children: "(required)" })
      ] })
    ] }),
    /* @__PURE__ */ jsx11(
      Textarea,
      {
        defaultValue,
        id: name,
        rows,
        ...register(name, { required })
      }
    ),
    errors[name] && /* @__PURE__ */ jsx11(Error, { name })
  ] });
};

// src/blocks/Form/fields.tsx
var fields = {
  checkbox: Checkbox2,
  country: Country,
  email: Email,
  message: Message,
  number: Number,
  select: Select2,
  state: State,
  text: Text,
  textarea: Textarea2
};

// block-preview-mock:get-url
function getClientSideURL() {
  return "";
}

// src/blocks/Form/Component.tsx
import { jsx as jsx12, jsxs as jsxs9 } from "react/jsx-runtime";
var FormBlock = (props) => {
  const {
    enableIntro,
    form: formFromProps,
    form: { id: formID, confirmationMessage, confirmationType, redirect, submitButtonLabel } = {},
    introContent
  } = props;
  const formMethods = useForm({
    defaultValues: formFromProps.fields
  });
  const {
    control,
    formState: { errors },
    handleSubmit,
    register
  } = formMethods;
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState();
  const [error, setError] = useState();
  const router = useRouter();
  const onSubmit = useCallback(
    (data) => {
      let loadingTimerID;
      const submitForm = async () => {
        setError(void 0);
        const dataToSend = Object.entries(data).map(([name, value]) => ({
          field: name,
          value
        }));
        loadingTimerID = setTimeout(() => {
          setIsLoading(true);
        }, 1e3);
        try {
          const req = await fetch(`${getClientSideURL()}/api/form-submissions`, {
            body: JSON.stringify({
              form: formID,
              submissionData: dataToSend
            }),
            headers: {
              "Content-Type": "application/json"
            },
            method: "POST"
          });
          const res = await req.json();
          clearTimeout(loadingTimerID);
          if (req.status >= 400) {
            setIsLoading(false);
            setError({
              message: res.errors?.[0]?.message || "Internal Server Error",
              status: res.status
            });
            return;
          }
          setIsLoading(false);
          setHasSubmitted(true);
          if (confirmationType === "redirect" && redirect) {
            const { url } = redirect;
            const redirectUrl = url;
            if (redirectUrl) router.push(redirectUrl);
          }
        } catch (err) {
          console.warn(err);
          setIsLoading(false);
          setError({
            message: "Something went wrong."
          });
        }
      };
      void submitForm();
    },
    [router, formID, redirect, confirmationType]
  );
  return /* @__PURE__ */ jsxs9("div", { className: "container lg:max-w-[48rem]", children: [
    enableIntro && introContent && !hasSubmitted && /* @__PURE__ */ jsx12(RichText, { className: "mb-8 lg:mb-12", data: introContent, enableGutter: false }),
    /* @__PURE__ */ jsx12("div", { className: "p-4 lg:p-6 border border-border rounded-[0.8rem]", children: /* @__PURE__ */ jsxs9(FormProvider, { ...formMethods, children: [
      !isLoading && hasSubmitted && confirmationType === "message" && /* @__PURE__ */ jsx12(RichText, { data: confirmationMessage }),
      isLoading && !hasSubmitted && /* @__PURE__ */ jsx12("p", { children: "Loading, please wait..." }),
      error && /* @__PURE__ */ jsx12("div", { children: `${error.status || "500"}: ${error.message || ""}` }),
      !hasSubmitted && /* @__PURE__ */ jsxs9("form", { id: formID, onSubmit: handleSubmit(onSubmit), children: [
        /* @__PURE__ */ jsx12("div", { className: "mb-4 last:mb-0", children: formFromProps && formFromProps.fields && formFromProps.fields?.map((field, index) => {
          const Field = fields?.[field.blockType];
          if (Field) {
            return /* @__PURE__ */ jsx12("div", { className: "mb-6 last:mb-0", children: /* @__PURE__ */ jsx12(
              Field,
              {
                form: formFromProps,
                ...field,
                ...formMethods,
                control,
                errors,
                register
              }
            ) }, index);
          }
          return null;
        }) }),
        /* @__PURE__ */ jsx12(Button, { form: formID, type: "submit", variant: "default", children: submitButtonLabel })
      ] })
    ] }) })
  ] });
};
export {
  FormBlock
};
