/* @ds-bundle: {"format":3,"namespace":"AioiBangkokInsuranceDesignSystem_cf9069","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Dialog","sourcePath":"components/overlay/Dialog.jsx"},{"name":"Toast","sourcePath":"components/overlay/Toast.jsx"},{"name":"Accordion","sourcePath":"components/surfaces/Accordion.jsx"},{"name":"Alert","sourcePath":"components/surfaces/Alert.jsx"},{"name":"Card","sourcePath":"components/surfaces/Card.jsx"},{"name":"Tabs","sourcePath":"components/surfaces/Tabs.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"db6b471ed822","components/core/Button.jsx":"3fe0d4847dca","components/core/Icon.jsx":"1ebe89f496df","components/core/IconButton.jsx":"5d689d98d979","components/core/Tag.jsx":"923ceb703bb7","components/forms/Checkbox.jsx":"57b7272a3337","components/forms/Input.jsx":"f76e8b251a0a","components/forms/Radio.jsx":"b40d0cf67a99","components/forms/Select.jsx":"dabfbc936dff","components/forms/Switch.jsx":"0be757cd319c","components/overlay/Dialog.jsx":"c2a3e7b69ef0","components/overlay/Toast.jsx":"d0bafff385b8","components/surfaces/Accordion.jsx":"d0cfa310b243","components/surfaces/Alert.jsx":"dcfaf104c31d","components/surfaces/Card.jsx":"8b1368705f0d","components/surfaces/Tabs.jsx":"87d220c478b9","ui_kits/website/Footer.jsx":"5ad342cafa43","ui_kits/website/Header.jsx":"4b514afa02a6","ui_kits/website/Hero.jsx":"f5e8107c626e","ui_kits/website/ProductPage.jsx":"8fdec891603c","ui_kits/website/Products.jsx":"4245779b6dbf","ui_kits/website/QuickActions.jsx":"ee11e23680b0","ui_kits/website/Services.jsx":"66cb3dcf9387"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AioiBangkokInsuranceDesignSystem_cf9069 = window.AioiBangkokInsuranceDesignSystem_cf9069 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Icon — thin wrapper over Lucide icons (CDN-available, MIT).
 * Requires the Lucide UMD script on the page:
 *   <script src="https://unpkg.com/lucide@0.456.0/dist/umd/lucide.min.js"></script>
 * Pass a Lucide icon name in PascalCase or kebab-case (e.g. "ShieldCheck" / "shield-check").
 */
function toPascal(name) {
  return String(name).replace(/(^|[-_\s])(\w)/g, (_, __, c) => c.toUpperCase());
}
function Icon({
  name,
  size = 20,
  stroke = 2,
  color = 'currentColor',
  className = '',
  style = {},
  ...rest
}) {
  const lucide = typeof window !== 'undefined' ? window.lucide : null;
  const key = toPascal(name);
  const node = lucide && lucide.icons ? lucide.icons[key] || lucide.icons[name] : null;
  const baseStyle = {
    display: 'inline-block',
    verticalAlign: 'middle',
    flex: 'none',
    ...style
  };
  if (!node) {
    // Fallback: empty square so layout doesn't collapse if Lucide isn't loaded.
    return /*#__PURE__*/React.createElement("svg", _extends({
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      className: className,
      style: baseStyle,
      "aria-hidden": "true"
    }, rest));
  }

  // Lucide icon = ["svg", svgAttrs, [ [tag, attrs], ... ]].
  // Newer builds may expose { iconNode: [...] }. Normalise to the child array.
  let childArray = [];
  if (Array.isArray(node) && Array.isArray(node[2])) childArray = node[2];else if (node && Array.isArray(node.iconNode)) childArray = node.iconNode;else if (Array.isArray(node) && Array.isArray(node[0])) childArray = node;
  const children = childArray.map(([tag, attrs], i) => React.createElement(tag, {
    key: i,
    ...attrs
  }));
  return /*#__PURE__*/React.createElement("svg", _extends({
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: baseStyle,
    "aria-hidden": "true"
  }, rest), children);
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — small status / metadata pill.
 */
function Badge({
  children,
  tone = 'navy',
  // 'navy' | 'red' | 'success' | 'warning' | 'info' | 'neutral'
  variant = 'soft',
  // 'soft' | 'solid' | 'outline'
  icon,
  style = {},
  ...rest
}) {
  const tones = {
    navy: {
      solid: 'var(--navy-700)',
      soft: 'var(--navy-50)',
      softFg: 'var(--navy-700)',
      line: 'var(--navy-200)'
    },
    red: {
      solid: 'var(--red-500)',
      soft: 'var(--red-50)',
      softFg: 'var(--red-600)',
      line: 'var(--red-200)'
    },
    success: {
      solid: 'var(--green-500)',
      soft: 'var(--green-50)',
      softFg: 'var(--green-600)',
      line: 'var(--green-100)'
    },
    warning: {
      solid: 'var(--amber-500)',
      soft: 'var(--amber-50)',
      softFg: 'var(--amber-600)',
      line: '#F3D9A8'
    },
    info: {
      solid: 'var(--navy-500)',
      soft: 'var(--sky-100)',
      softFg: 'var(--navy-600)',
      line: 'var(--sky-200)'
    },
    neutral: {
      solid: 'var(--ink-500)',
      soft: 'var(--ink-100)',
      softFg: 'var(--ink-700)',
      line: 'var(--ink-300)'
    }
  };
  const t = tones[tone] || tones.navy;
  const variants = {
    solid: {
      background: t.solid,
      color: '#fff',
      border: '1px solid transparent'
    },
    soft: {
      background: t.soft,
      color: t.softFg,
      border: '1px solid transparent'
    },
    outline: {
      background: 'transparent',
      color: t.softFg,
      border: `1px solid ${t.line}`
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 24,
      padding: '0 10px',
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: '.01em',
      borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap',
      ...variants[variant],
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13,
    stroke: 2.5
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — Aioi's primary action element.
 * Energetic red default; navy and outline/ghost alternates; optional pill shape.
 */
function Button({
  children,
  variant = 'primary',
  // 'primary' | 'navy' | 'outline' | 'ghost' | 'danger'
  size = 'md',
  // 'sm' | 'md' | 'lg'
  shape = 'rounded',
  // 'rounded' | 'pill'
  iconLeft,
  // lucide icon name
  iconRight,
  block = false,
  disabled = false,
  type = 'button',
  onClick,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      h: 36,
      px: 16,
      fs: 14,
      gap: 7,
      icon: 16
    },
    md: {
      h: 44,
      px: 22,
      fs: 16,
      gap: 8,
      icon: 18
    },
    lg: {
      h: 52,
      px: 30,
      fs: 18,
      gap: 9,
      icon: 20
    }
  };
  const s = sizes[size] || sizes.md;
  const palettes = {
    primary: {
      bg: 'var(--red-500)',
      fg: '#fff',
      bd: 'transparent',
      hov: 'var(--red-600)',
      press: 'var(--red-700)',
      shadow: 'var(--shadow-red)'
    },
    navy: {
      bg: 'var(--navy-700)',
      fg: '#fff',
      bd: 'transparent',
      hov: 'var(--navy-600)',
      press: 'var(--navy-800)',
      shadow: 'var(--shadow-navy)'
    },
    danger: {
      bg: 'var(--red-600)',
      fg: '#fff',
      bd: 'transparent',
      hov: 'var(--red-700)',
      press: 'var(--red-800)',
      shadow: 'var(--shadow-red)'
    },
    outline: {
      bg: 'transparent',
      fg: 'var(--navy-700)',
      bd: 'var(--navy-700)',
      hov: 'var(--navy-50)',
      press: 'var(--navy-100)',
      shadow: 'none'
    },
    ghost: {
      bg: 'transparent',
      fg: 'var(--navy-700)',
      bd: 'transparent',
      hov: 'var(--navy-50)',
      press: 'var(--navy-100)',
      shadow: 'none'
    }
  };
  const p = palettes[variant] || palettes.primary;
  const base = {
    display: block ? 'flex' : 'inline-flex',
    width: block ? '100%' : 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.gap,
    height: s.h,
    padding: `0 ${s.px}px`,
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: s.fs,
    lineHeight: 1,
    color: p.fg,
    background: p.bg,
    border: `2px solid ${p.bd}`,
    borderRadius: shape === 'pill' ? 'var(--radius-pill)' : 'var(--radius-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background .16s ease, box-shadow .16s ease, transform .08s ease',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    ...style
  };
  const onEnter = e => {
    if (!disabled) e.currentTarget.style.background = p.hov;
  };
  const onLeave = e => {
    if (!disabled) {
      e.currentTarget.style.background = p.bg;
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'none';
    }
  };
  const onDown = e => {
    if (!disabled) {
      e.currentTarget.style.background = p.press;
      e.currentTarget.style.transform = 'translateY(1px)';
    }
  };
  const onUp = e => {
    if (!disabled) {
      e.currentTarget.style.background = p.hov;
      e.currentTarget.style.boxShadow = p.shadow;
      e.currentTarget.style.transform = 'none';
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    onMouseDown: onDown,
    onMouseUp: onUp,
    style: base
  }, rest), iconLeft && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: s.icon,
    stroke: 2.25
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.icon,
    stroke: 2.25
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * IconButton — square icon-only action (toolbar, close, nav).
 */
function IconButton({
  icon,
  variant = 'soft',
  // 'soft' | 'navy' | 'red' | 'ghost'
  size = 'md',
  // 'sm' | 'md' | 'lg'
  shape = 'rounded',
  // 'rounded' | 'circle'
  disabled = false,
  ariaLabel,
  onClick,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: 34,
    md: 44,
    lg: 52
  };
  const dim = sizes[size] || sizes.md;
  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24
  }[size] || 20;
  const palettes = {
    soft: {
      bg: 'var(--navy-50)',
      fg: 'var(--navy-700)',
      hov: 'var(--navy-100)'
    },
    navy: {
      bg: 'var(--navy-700)',
      fg: '#fff',
      hov: 'var(--navy-600)'
    },
    red: {
      bg: 'var(--red-500)',
      fg: '#fff',
      hov: 'var(--red-600)'
    },
    ghost: {
      bg: 'transparent',
      fg: 'var(--navy-700)',
      hov: 'var(--navy-50)'
    }
  };
  const p = palettes[variant] || palettes.soft;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": ariaLabel,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.background = p.hov;
    },
    onMouseLeave: e => {
      if (!disabled) e.currentTarget.style.background = p.bg;
    },
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: dim,
      height: dim,
      background: p.bg,
      color: p.fg,
      border: 'none',
      borderRadius: shape === 'circle' ? '999px' : 'var(--radius-sm)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background .16s ease',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: iconSize,
    stroke: 2.25
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tag / Chip — selectable or removable label.
 */
function Tag({
  children,
  icon,
  selected = false,
  removable = false,
  onRemove,
  onClick,
  style = {},
  ...rest
}) {
  const interactive = !!onClick;
  return /*#__PURE__*/React.createElement("span", _extends({
    onClick: onClick,
    role: interactive ? 'button' : undefined,
    tabIndex: interactive ? 0 : undefined,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 32,
      padding: '0 14px',
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      fontSize: 14,
      borderRadius: 'var(--radius-pill)',
      background: selected ? 'var(--navy-700)' : 'var(--white)',
      color: selected ? '#fff' : 'var(--navy-700)',
      border: `1.5px solid ${selected ? 'var(--navy-700)' : 'var(--ink-300)'}`,
      cursor: interactive ? 'pointer' : 'default',
      transition: 'all .15s ease',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 15,
    stroke: 2.25
  }), children, removable && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 15,
    stroke: 2.5,
    onClick: e => {
      e.stopPropagation();
      onRemove && onRemove();
    },
    style: {
      cursor: 'pointer',
      marginRight: -4,
      opacity: 0.7
    }
  }));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Checkbox — square check control with label.
 */
function Checkbox({
  checked = false,
  onChange,
  label,
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const cbId = id || React.useId();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: cbId,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1,
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      color: 'var(--ink-800)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: cbId,
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 22,
      height: 22,
      flex: 'none',
      borderRadius: 'var(--radius-xs)',
      background: checked ? 'var(--navy-700)' : 'var(--white)',
      border: `1.5px solid ${checked ? 'var(--navy-700)' : 'var(--ink-400)'}`,
      transition: 'all .15s ease'
    }
  }, checked && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 15,
    color: "#fff",
    stroke: 3
  })), label && /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — labelled text field with optional icon, hint and error.
 */
function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  iconLeft,
  hint,
  error,
  disabled = false,
  required = false,
  suffix,
  id,
  style = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const inputId = id || React.useId();
  const borderColor = error ? 'var(--red-500)' : focused ? 'var(--navy-500)' : 'var(--ink-300)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--navy-800)'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--red-500)',
      marginLeft: 3
    }
  }, "*")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: 'var(--control-h-md)',
      padding: '0 14px',
      background: disabled ? 'var(--ink-100)' : 'var(--white)',
      border: `1.5px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focused && !error ? '0 0 0 3px var(--ring-color)' : 'none',
      transition: 'border-color .15s ease, box-shadow .15s ease'
    }
  }, iconLeft && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: 18,
    color: "var(--ink-500)"
  }), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    required: required,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      color: 'var(--ink-900)',
      minWidth: 0
    }
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--ink-500)'
    }
  }, suffix)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: error ? 'var(--red-600)' : 'var(--ink-500)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Radio — single-choice control. Use within a shared-name group.
 */
function Radio({
  checked = false,
  onChange,
  label,
  name,
  value,
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const rId = id || React.useId();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: rId,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1,
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      color: 'var(--ink-800)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: rId,
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 22,
      height: 22,
      flex: 'none',
      borderRadius: '999px',
      background: 'var(--white)',
      border: `1.5px solid ${checked ? 'var(--navy-700)' : 'var(--ink-400)'}`,
      transition: 'all .15s ease'
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 11,
      borderRadius: '999px',
      background: 'var(--navy-700)'
    }
  })), label && /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Select — native dropdown styled to match the Aioi field system.
 */
function Select({
  label,
  value,
  onChange,
  options = [],
  // [{ value, label }]
  placeholder = 'เลือก…',
  hint,
  error,
  disabled = false,
  required = false,
  id,
  style = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const selectId = id || React.useId();
  const borderColor = error ? 'var(--red-500)' : focused ? 'var(--navy-500)' : 'var(--ink-300)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: selectId,
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--navy-800)'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--red-500)',
      marginLeft: 3
    }
  }, "*")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      height: 'var(--control-h-md)',
      background: disabled ? 'var(--ink-100)' : 'var(--white)',
      border: `1.5px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focused && !error ? '0 0 0 3px var(--ring-color)' : 'none',
      transition: 'border-color .15s ease, box-shadow .15s ease'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: selectId,
    value: value,
    onChange: onChange,
    disabled: disabled,
    required: required,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      appearance: 'none',
      WebkitAppearance: 'none',
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      color: value ? 'var(--ink-900)' : 'var(--ink-400)',
      padding: '0 40px 0 14px',
      height: '100%',
      cursor: 'pointer'
    }
  }, rest), /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder), options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 18,
    color: "var(--ink-500)",
    style: {
      position: 'absolute',
      right: 14,
      pointerEvents: 'none'
    }
  })), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: error ? 'var(--red-600)' : 'var(--ink-500)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Switch — on/off toggle.
 */
function Switch({
  checked = false,
  onChange,
  label,
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const swId = id || React.useId();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: swId,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1,
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      color: 'var(--ink-800)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: swId,
    type: "checkbox",
    role: "switch",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'relative',
      width: 46,
      height: 26,
      flex: 'none',
      borderRadius: '999px',
      background: checked ? 'var(--red-500)' : 'var(--ink-300)',
      transition: 'background .18s ease'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: checked ? 23 : 3,
      width: 20,
      height: 20,
      borderRadius: '999px',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,.25)',
      transition: 'left .18s ease'
    }
  })), label && /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Dialog.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Dialog — centered modal with scrim. Render conditionally on `open`.
 */
function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
  tone = 'navy',
  // header accent: 'navy' | 'red'
  ...rest
}) {
  if (!open) return null;
  const accent = tone === 'red' ? 'var(--red-500)' : 'var(--navy-700)';
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "dialog",
    "aria-modal": "true",
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      background: 'rgba(11, 29, 66, 0.55)',
      backdropFilter: 'blur(2px)'
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      maxWidth: width,
      background: 'var(--white)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-xl)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '90vh'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      background: accent
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      padding: '20px 24px 0'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 22,
      color: 'var(--navy-900)'
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "\u0E1B\u0E34\u0E14",
    style: {
      display: 'inline-flex',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--ink-500)',
      padding: 4,
      marginTop: -2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 22
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 24px 20px',
      overflowY: 'auto',
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      lineHeight: 1.6,
      color: 'var(--ink-700)'
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 10,
      padding: '16px 24px',
      borderTop: '1px solid var(--ink-100)',
      background: 'var(--ink-50)'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Toast — transient notification chip. Render in a fixed stack.
 */
function Toast({
  children,
  tone = 'navy',
  // 'navy' | 'success' | 'danger' | 'warning'
  icon,
  onClose,
  style = {},
  ...rest
}) {
  const tones = {
    navy: {
      bg: 'var(--navy-700)',
      icon: 'bell'
    },
    success: {
      bg: 'var(--green-500)',
      icon: 'check-circle'
    },
    danger: {
      bg: 'var(--red-500)',
      icon: 'alert-circle'
    },
    warning: {
      bg: 'var(--amber-500)',
      icon: 'alert-triangle'
    }
  };
  const t = tones[tone] || tones.navy;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minWidth: 280,
      maxWidth: 420,
      padding: '13px 16px',
      background: t.bg,
      color: '#fff',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-lg)',
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      fontWeight: 500,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || t.icon,
    size: 20,
    color: "#fff"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, children), onClose && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 18,
    color: "rgba(255,255,255,.8)",
    onClick: onClose,
    style: {
      cursor: 'pointer'
    }
  }));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Toast.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Accordion.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Accordion — FAQ-style expandable list. Common on Aioi product pages.
 */
function Accordion({
  items = [],
  // [{ id, question, answer }]
  allowMultiple = false,
  style = {},
  ...rest
}) {
  const [open, setOpen] = React.useState([]);
  const toggle = id => {
    setOpen(cur => cur.includes(id) ? cur.filter(x => x !== id) : allowMultiple ? [...cur, id] : [id]);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      ...style
    }
  }, rest), items.map(it => {
    const on = open.includes(it.id);
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      style: {
        border: `1.5px solid ${on ? 'var(--navy-200)' : 'var(--ink-200)'}`,
        borderRadius: 'var(--radius-md)',
        background: 'var(--white)',
        overflow: 'hidden',
        transition: 'border-color .15s ease'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => toggle(it.id),
      "aria-expanded": on,
      style: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        padding: '16px 18px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 16,
        color: 'var(--navy-900)'
      }
    }, /*#__PURE__*/React.createElement("span", null, it.question), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "chevron-down",
      size: 20,
      color: "var(--navy-600)",
      style: {
        transform: on ? 'rotate(180deg)' : 'none',
        transition: 'transform .2s ease'
      }
    })), on && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 18px 18px',
        fontFamily: 'var(--font-body)',
        fontSize: 15,
        lineHeight: 1.65,
        color: 'var(--ink-700)'
      }
    }, it.answer));
  }));
}
Object.assign(__ds_scope, { Accordion });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Accordion.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Alert — inline message banner.
 */
function Alert({
  children,
  title,
  tone = 'info',
  // 'info' | 'success' | 'warning' | 'danger'
  icon,
  // override lucide name
  onClose,
  style = {},
  ...rest
}) {
  const tones = {
    info: {
      bg: 'var(--sky-100)',
      bar: 'var(--navy-500)',
      fg: 'var(--navy-800)',
      icon: 'info'
    },
    success: {
      bg: 'var(--green-50)',
      bar: 'var(--green-500)',
      fg: 'var(--green-600)',
      icon: 'check-circle'
    },
    warning: {
      bg: 'var(--amber-50)',
      bar: 'var(--amber-500)',
      fg: 'var(--amber-600)',
      icon: 'alert-triangle'
    },
    danger: {
      bg: 'var(--red-50)',
      bar: 'var(--red-500)',
      fg: 'var(--red-600)',
      icon: 'alert-circle'
    }
  };
  const t = tones[tone] || tones.info;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      padding: '14px 16px',
      borderRadius: 'var(--radius-md)',
      background: t.bg,
      borderLeft: `4px solid ${t.bar}`,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || t.icon,
    size: 20,
    color: t.bar,
    style: {
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 15,
      color: t.fg,
      marginBottom: 2
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      lineHeight: 1.55,
      color: 'var(--ink-700)'
    }
  }, children)), onClose && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 18,
    color: "var(--ink-500)",
    onClick: onClose,
    style: {
      cursor: 'pointer',
      marginTop: 1
    }
  }));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Alert.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — flexible content container with three brand styles.
 * variant "feature" adds the signature navy top accent bar.
 */
function Card({
  children,
  variant = 'elevated',
  // 'elevated' | 'outline' | 'feature'
  image,
  // image url (rendered as a 16:9 top media)
  imageAlt = '',
  icon,
  // lucide name -> rendered in a red roundel
  eyebrow,
  title,
  footer,
  accent = 'navy',
  // 'navy' | 'red' (feature bar / icon color)
  padding = 24,
  onClick,
  style = {},
  ...rest
}) {
  const accentColor = accent === 'red' ? 'var(--red-500)' : 'var(--navy-700)';
  const surfaces = {
    elevated: {
      background: 'var(--white)',
      border: '1px solid var(--ink-100)',
      boxShadow: 'var(--shadow-md)'
    },
    outline: {
      background: 'var(--white)',
      border: '1.5px solid var(--ink-200)',
      boxShadow: 'none'
    },
    feature: {
      background: 'var(--white)',
      border: '1px solid var(--ink-100)',
      boxShadow: 'var(--shadow-md)'
    }
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow .18s ease, transform .18s ease',
      ...surfaces[variant],
      ...style
    },
    onMouseEnter: onClick ? e => {
      e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    } : undefined,
    onMouseLeave: onClick ? e => {
      e.currentTarget.style.boxShadow = surfaces[variant].boxShadow;
      e.currentTarget.style.transform = 'none';
    } : undefined
  }, rest), variant === 'feature' && /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      background: accentColor
    }
  }), image && /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: '16 / 9',
      overflow: 'hidden',
      background: 'var(--ink-100)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: imageAlt,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      flex: 1
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 48,
      height: 48,
      borderRadius: 'var(--radius-md)',
      background: accent === 'red' ? 'var(--red-50)' : 'var(--navy-50)',
      color: accentColor
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 26,
    stroke: 2
  })), eyebrow && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      color: 'var(--red-500)'
    }
  }, eyebrow), title && /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 21,
      lineHeight: 1.3,
      color: 'var(--navy-900)'
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      lineHeight: 1.6,
      color: 'var(--ink-700)'
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      paddingTop: 6
    }
  }, footer)));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Card.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tabs — underline-style tab bar with a red active indicator.
 */
function Tabs({
  tabs = [],
  // [{ id, label }]
  active,
  onChange,
  style = {},
  ...rest
}) {
  const [internal, setInternal] = React.useState(tabs[0] && tabs[0].id);
  const current = active !== undefined ? active : internal;
  const select = id => {
    setInternal(id);
    onChange && onChange(id);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: 'flex',
      gap: 4,
      borderBottom: '2px solid var(--ink-200)',
      ...style
    }
  }, rest), tabs.map(t => {
    const on = t.id === current;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      role: "tab",
      "aria-selected": on,
      onClick: () => select(t.id),
      style: {
        position: 'relative',
        border: 'none',
        background: 'transparent',
        padding: '12px 18px',
        marginBottom: -2,
        cursor: 'pointer',
        fontFamily: 'var(--font-display)',
        fontWeight: on ? 600 : 500,
        fontSize: 16,
        color: on ? 'var(--navy-900)' : 'var(--ink-500)',
        borderBottom: `3px solid ${on ? 'var(--red-500)' : 'transparent'}`,
        transition: 'color .15s ease'
      }
    }, t.label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Footer.jsx
try { (() => {
(function () {
  const {
    Icon
  } = window.AioiBangkokInsuranceDesignSystem_cf9069;
  function AioiFooter() {
    const cols = [{
      title: 'ผลิตภัณฑ์',
      links: ['ประกันรถยนต์ชั้น 1', 'ประกันชั้น 2+ / 3+', 'พ.ร.บ.', 'Aioi Happy Home', 'Buddy P.A. Plan']
    }, {
      title: 'บริการ',
      links: ['แจ้งเคลมออนไลน์', 'Aioi Remote Survey', 'AIOI-Tracking', 'ต่ออายุกรมธรรม์', 'ค้นหาอู่/ศูนย์']
    }, {
      title: 'เกี่ยวกับเรา',
      links: ['ข้อมูลบริษัท', 'ข่าวสารและโปรโมชัน', 'ร่วมงานกับเรา', 'นโยบายความเป็นส่วนตัว']
    }];
    return /*#__PURE__*/React.createElement("footer", {
      style: {
        background: 'var(--navy-900)',
        color: 'rgba(255,255,255,.72)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "aioi-container",
      style: {
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
        gap: 40,
        padding: '56px 24px 40px'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/logo/aioi-mark.png",
      alt: "",
      style: {
        height: 40,
        width: 'auto',
        background: '#fff',
        borderRadius: 8,
        padding: '4px 6px'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        lineHeight: 1.1
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 16,
        color: '#fff'
      }
    }, "\u0E44\u0E2D\u0E42\u0E2D\u0E2D\u0E34 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E \u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E20\u0E31\u0E22"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 9,
        letterSpacing: '.12em',
        color: 'rgba(255,255,255,.55)',
        marginTop: 3
      }
    }, "AIOI BANGKOK INSURANCE"))), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        lineHeight: 1.7,
        maxWidth: 300
      }
    }, "\u0E1A\u0E23\u0E34\u0E29\u0E31\u0E17 \u0E44\u0E2D\u0E42\u0E2D\u0E2D\u0E34 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E \u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E20\u0E31\u0E22 \u0E08\u0E33\u0E01\u0E31\u0E14 (\u0E21\u0E2B\u0E32\u0E0A\u0E19)", /*#__PURE__*/React.createElement("br", null), "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48 25 \u0E2D\u0E32\u0E04\u0E32\u0E23\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E20\u0E31\u0E22/YWCA \u0E0A\u0E31\u0E49\u0E19 14 \u0E41\u0E25\u0E30 22", /*#__PURE__*/React.createElement("br", null), "\u0E16\u0E19\u0E19\u0E2A\u0E32\u0E17\u0E23\u0E43\u0E15\u0E49 \u0E41\u0E02\u0E27\u0E07\u0E17\u0E38\u0E48\u0E07\u0E21\u0E2B\u0E32\u0E40\u0E21\u0E06 \u0E40\u0E02\u0E15\u0E2A\u0E32\u0E17\u0E23 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E2F 10120"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginTop: 16,
        color: '#fff'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "phone",
      size: 18,
      color: "var(--red-400)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 22
      }
    }, "1292"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'rgba(255,255,255,.6)'
      }
    }, "\u0E15\u0E25\u0E2D\u0E14 24 \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07"))), cols.map((c, i) => /*#__PURE__*/React.createElement("div", {
      key: i
    }, /*#__PURE__*/React.createElement("h4", {
      style: {
        margin: '0 0 16px',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 16,
        color: '#fff'
      }
    }, c.title), /*#__PURE__*/React.createElement("ul", {
      style: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 11
      }
    }, c.links.map((l, j) => /*#__PURE__*/React.createElement("li", {
      key: j
    }, /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        color: 'rgba(255,255,255,.72)'
      },
      onMouseEnter: e => e.currentTarget.style.color = '#fff',
      onMouseLeave: e => e.currentTarget.style.color = 'rgba(255,255,255,.72)'
    }, l))))))), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: '1px solid rgba(255,255,255,.12)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "aioi-container",
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 24px',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        color: 'rgba(255,255,255,.55)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "\xA9 2569 Aioi Bangkok Insurance PCL. \u0E2A\u0E07\u0E27\u0E19\u0E25\u0E34\u0E02\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        color: 'rgba(255,255,255,.55)'
      }
    }, "\u0E02\u0E49\u0E2D\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19"), /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        color: 'rgba(255,255,255,.55)'
      }
    }, "\u0E19\u0E42\u0E22\u0E1A\u0E32\u0E22\u0E04\u0E38\u0E01\u0E01\u0E35\u0E49")))));
  }
  window.AioiFooter = AioiFooter;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Header.jsx
try { (() => {
(function () {
  const {
    Button,
    IconButton,
    Icon
  } = window.AioiBangkokInsuranceDesignSystem_cf9069;
  function AioiHeader({
    onClaim
  }) {
    const [open, setOpen] = React.useState(null);
    const nav = [{
      label: 'ประกันรถยนต์',
      items: ['ประกันชั้น 1', 'ประกันชั้น 2+', 'ประกันชั้น 3+', 'พ.ร.บ.']
    }, {
      label: 'ประกันอื่นๆ',
      items: ['Aioi Happy Home', 'Buddy P.A. Plan', 'ประกันเดินทาง']
    }, {
      label: 'บริการเคลม',
      items: ['แจ้งเคลมออนไลน์', 'Aioi Remote Survey', 'AIOI-Tracking', 'เครือข่ายอู่/ศูนย์']
    }, {
      label: 'เกี่ยวกับเรา',
      items: []
    }];
    return /*#__PURE__*/React.createElement("header", {
      style: {
        position: 'sticky',
        top: 0,
        zIndex: 50
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--navy-900)',
        color: 'rgba(255,255,255,.85)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "aioi-container",
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 22,
        height: 38,
        fontFamily: 'var(--font-body)',
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "phone",
      size: 14
    }), " \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C 1292"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "map-pin",
      size: 14
    }), " \u0E04\u0E49\u0E19\u0E2B\u0E32\u0E2A\u0E32\u0E02\u0E32"), /*#__PURE__*/React.createElement("span", {
      style: {
        opacity: .4
      }
    }, "|"), /*#__PURE__*/React.createElement("span", {
      style: {
        cursor: 'pointer'
      }
    }, "\u0E44\u0E17\u0E22"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "user",
      size: 14
    }), " \u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A"))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--white)',
        boxShadow: 'var(--shadow-sm)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "aioi-container",
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        height: 76
      }
    }, /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/logo/aioi-mark.png",
      alt: "",
      style: {
        height: 42,
        width: 'auto'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        lineHeight: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 18,
        color: 'var(--navy-800)'
      }
    }, "\u0E44\u0E2D\u0E42\u0E2D\u0E2D\u0E34 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E \u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E20\u0E31\u0E22"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 9.5,
        letterSpacing: '.13em',
        color: 'var(--navy-500)',
        marginTop: 4
      }
    }, "AIOI BANGKOK INSURANCE"))), /*#__PURE__*/React.createElement("nav", {
      style: {
        display: 'flex',
        gap: 4,
        marginLeft: 8
      },
      onMouseLeave: () => setOpen(null)
    }, nav.map((n, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        position: 'relative'
      },
      onMouseEnter: () => setOpen(i)
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        border: 'none',
        background: 'transparent',
        padding: '0 14px',
        height: 76,
        cursor: 'pointer',
        fontFamily: 'var(--font-display)',
        fontWeight: 500,
        fontSize: 16,
        color: open === i ? 'var(--red-500)' : 'var(--navy-900)'
      }
    }, n.label, n.items.length > 0 && /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-down",
      size: 15,
      style: {
        transform: open === i ? 'rotate(180deg)' : 'none',
        transition: 'transform .2s'
      }
    })), open === i && n.items.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 72,
        left: 8,
        minWidth: 230,
        background: '#fff',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--ink-100)',
        padding: 8,
        display: 'flex',
        flexDirection: 'column'
      }
    }, n.items.map((it, j) => /*#__PURE__*/React.createElement("a", {
      key: j,
      href: "#",
      style: {
        padding: '10px 14px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 15,
        color: 'var(--ink-700)',
        fontFamily: 'var(--font-body)'
      },
      onMouseEnter: e => {
        e.currentTarget.style.background = 'var(--navy-50)';
        e.currentTarget.style.color = 'var(--navy-800)';
      },
      onMouseLeave: e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--ink-700)';
      }
    }, it)))))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      icon: "search",
      variant: "ghost",
      ariaLabel: "\u0E04\u0E49\u0E19\u0E2B\u0E32"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "navy",
      size: "sm",
      iconLeft: "file-text",
      onClick: onClaim
    }, "\u0E41\u0E08\u0E49\u0E07\u0E40\u0E04\u0E25\u0E21"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "sm",
      iconRight: "arrow-right"
    }, "\u0E0B\u0E37\u0E49\u0E2D\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19")))), /*#__PURE__*/React.createElement("div", {
      className: "aioi-edge-stripe"
    }));
  }
  window.AioiHeader = AioiHeader;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Hero.jsx
try { (() => {
(function () {
  const {
    Button,
    Badge,
    Select,
    Icon
  } = window.AioiBangkokInsuranceDesignSystem_cf9069;
  function AioiHero({
    onQuote
  }) {
    const [cls, setCls] = React.useState('1');
    const [brand, setBrand] = React.useState('');
    return /*#__PURE__*/React.createElement("section", {
      style: {
        position: 'relative',
        background: 'var(--navy-900)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      "aria-hidden": "true",
      style: {
        position: 'absolute',
        inset: 0,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -60,
        right: '34%',
        width: 320,
        height: 'calc(100% + 120px)',
        background: 'var(--red-500)',
        transform: 'skewX(-18deg)',
        opacity: .95
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -60,
        right: '30%',
        width: 60,
        height: 'calc(100% + 120px)',
        background: 'rgba(255,255,255,.10)',
        transform: 'skewX(-18deg)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -60,
        right: -120,
        width: '46%',
        height: 'calc(100% + 120px)',
        background: 'var(--navy-700)',
        transform: 'skewX(-18deg)'
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "aioi-container",
      style: {
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1.05fr 0.95fr',
        gap: 40,
        alignItems: 'center',
        minHeight: 520,
        padding: '56px 24px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 540
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: "red",
      variant: "solid",
      icon: "shield-check"
    }, "\u0E14\u0E39\u0E41\u0E25\u0E04\u0E38\u0E13\u0E21\u0E32\u0E01\u0E27\u0E48\u0E32 70 \u0E1B\u0E35"), /*#__PURE__*/React.createElement("h1", {
      style: {
        margin: '18px 0 0',
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 54,
        lineHeight: 1.12,
        color: '#fff'
      }
    }, "\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E20\u0E31\u0E22\u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C", /*#__PURE__*/React.createElement("br", null), "\u0E17\u0E35\u0E48\u0E04\u0E38\u0E13", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--red-400)'
      }
    }, "\u0E27\u0E32\u0E07\u0E43\u0E08")), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '18px 0 28px',
        fontFamily: 'var(--font-body)',
        fontSize: 19,
        lineHeight: 1.7,
        color: 'rgba(255,255,255,.82)',
        maxWidth: 460
      }
    }, "\u0E40\u0E04\u0E25\u0E21\u0E40\u0E23\u0E47\u0E27 \u0E17\u0E31\u0E19\u0E43\u0E08 \u0E14\u0E49\u0E27\u0E22\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23 Aioi Remote Survey \u0E41\u0E25\u0E30\u0E40\u0E04\u0E23\u0E37\u0E2D\u0E02\u0E48\u0E32\u0E22\u0E2D\u0E39\u0E48\u2013\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E0B\u0E48\u0E2D\u0E21\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E17\u0E31\u0E48\u0E27\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        padding: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 17,
        color: 'var(--navy-900)',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "calculator",
      size: 20,
      color: "var(--red-500)"
    }), " \u0E40\u0E0A\u0E47\u0E04\u0E40\u0E1A\u0E35\u0E49\u0E22\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement(Select, {
      label: "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19",
      value: cls,
      onChange: e => setCls(e.target.value),
      options: [{
        value: '1',
        label: 'ชั้น 1'
      }, {
        value: '2',
        label: 'ชั้น 2+'
      }, {
        value: '3',
        label: 'ชั้น 3+'
      }]
    }), /*#__PURE__*/React.createElement(Select, {
      label: "\u0E22\u0E35\u0E48\u0E2B\u0E49\u0E2D\u0E23\u0E16",
      value: brand,
      onChange: e => setBrand(e.target.value),
      options: [{
        value: 'toyota',
        label: 'Toyota'
      }, {
        value: 'honda',
        label: 'Honda'
      }, {
        value: 'isuzu',
        label: 'Isuzu'
      }, {
        value: 'other',
        label: 'อื่นๆ'
      }]
    })), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      block: true,
      iconRight: "arrow-right",
      onClick: () => onQuote && onQuote({
        cls,
        brand
      })
    }, "\u0E04\u0E33\u0E19\u0E27\u0E13\u0E40\u0E1A\u0E35\u0E49\u0E22\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19"))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
        aspectRatio: '4 / 3',
        border: '6px solid rgba(255,255,255,.12)'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/photos/couple-home.png",
      alt: "",
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: -18,
        left: -18,
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        width: 44,
        height: 44,
        borderRadius: 'var(--radius-md)',
        background: 'var(--green-50)',
        color: 'var(--green-500)',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "clock",
      size: 24
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        lineHeight: 1.25
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        display: 'block',
        fontFamily: 'var(--font-display)',
        fontSize: 20,
        color: 'var(--navy-900)'
      }
    }, "\u0E40\u0E04\u0E25\u0E21\u0E44\u0E27 24 \u0E0A\u0E21."), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--ink-500)'
      }
    }, "\u0E16\u0E36\u0E07\u0E17\u0E35\u0E48\u0E40\u0E01\u0E34\u0E14\u0E40\u0E2B\u0E15\u0E38 \u0E40\u0E09\u0E25\u0E35\u0E48\u0E22 30 \u0E19\u0E32\u0E17\u0E35"))))));
  }
  window.AioiHero = AioiHero;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ProductPage.jsx
try { (() => {
(function () {
  const {
    Button,
    Badge,
    Tabs,
    Accordion,
    Card,
    Icon
  } = window.AioiBangkokInsuranceDesignSystem_cf9069;
  function AioiProductPage() {
    const [tab, setTab] = React.useState('cov');
    const coverage = [{
      label: 'ความเสียหายต่อตัวรถยนต์',
      value: 'สูงสุด 100% ของทุนประกัน'
    }, {
      label: 'รถยนต์สูญหาย / ไฟไหม้',
      value: 'คุ้มครองเต็มทุนประกัน'
    }, {
      label: 'น้ำท่วม / ภัยธรรมชาติ',
      value: 'คุ้มครอง'
    }, {
      label: 'บุคคลภายนอก (ต่อคน)',
      value: '1,000,000 บาท'
    }, {
      label: 'บุคคลภายนอก (ต่อครั้ง)',
      value: '10,000,000 บาท'
    }, {
      label: 'อุบัติเหตุส่วนบุคคล',
      value: '100,000 บาท / คน'
    }, {
      label: 'ค่ารักษาพยาบาล',
      value: '100,000 บาท / คน'
    }, {
      label: 'ประกันตัวผู้ขับขี่',
      value: '300,000 บาท'
    }];
    return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
      style: {
        background: 'var(--navy-900)',
        position: 'relative',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      "aria-hidden": "true",
      style: {
        position: 'absolute',
        top: -40,
        right: -100,
        width: '40%',
        height: 'calc(100% + 80px)',
        background: 'var(--red-500)',
        transform: 'skewX(-18deg)',
        opacity: .9
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "aioi-container",
      style: {
        position: 'relative',
        padding: '32px 24px 56px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        color: 'rgba(255,255,255,.6)',
        marginBottom: 24
      }
    }, /*#__PURE__*/React.createElement("a", {
      href: "index.html",
      style: {
        color: 'rgba(255,255,255,.6)'
      }
    }, "\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E23\u0E01"), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 14
    }), /*#__PURE__*/React.createElement("span", null, "\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C"), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 14
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#fff'
      }
    }, "\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E0A\u0E31\u0E49\u0E19 1")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: 40,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Badge, {
      tone: "red",
      variant: "solid",
      icon: "award"
    }, "\u0E02\u0E32\u0E22\u0E14\u0E35\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14"), /*#__PURE__*/React.createElement("h1", {
      style: {
        margin: '16px 0 12px',
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 46,
        lineHeight: 1.15,
        color: '#fff'
      }
    }, "\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C\u0E0A\u0E31\u0E49\u0E19 1"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-body)',
        fontSize: 18,
        lineHeight: 1.7,
        color: 'rgba(255,255,255,.82)',
        maxWidth: 480
      }
    }, "\u0E04\u0E27\u0E32\u0E21\u0E04\u0E38\u0E49\u0E21\u0E04\u0E23\u0E2D\u0E07\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E23\u0E16\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13 \u0E0B\u0E48\u0E2D\u0E21\u0E2B\u0E49\u0E32\u0E07\u2013\u0E0B\u0E48\u0E2D\u0E21\u0E28\u0E39\u0E19\u0E22\u0E4C \u0E04\u0E38\u0E49\u0E21\u0E04\u0E23\u0E2D\u0E07\u0E19\u0E49\u0E33\u0E17\u0E48\u0E27\u0E21 \u0E44\u0E1F\u0E44\u0E2B\u0E21\u0E49 \u0E41\u0E25\u0E30\u0E20\u0E31\u0E22\u0E18\u0E23\u0E23\u0E21\u0E0A\u0E32\u0E15\u0E34 \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E40\u0E04\u0E25\u0E21 24 \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        marginTop: 22,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: "info",
      variant: "soft",
      icon: "check"
    }, "\u0E0B\u0E48\u0E2D\u0E21\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19"), /*#__PURE__*/React.createElement(Badge, {
      tone: "info",
      variant: "soft",
      icon: "check"
    }, "\u0E04\u0E38\u0E49\u0E21\u0E04\u0E23\u0E2D\u0E07\u0E19\u0E49\u0E33\u0E17\u0E48\u0E27\u0E21"), /*#__PURE__*/React.createElement(Badge, {
      tone: "info",
      variant: "soft",
      icon: "check"
    }, "\u0E1C\u0E48\u0E2D\u0E19 0% 6 \u0E40\u0E14\u0E37\u0E2D\u0E19"))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        padding: 26
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 15,
        color: 'var(--ink-500)'
      }
    }, "\u0E40\u0E1A\u0E35\u0E49\u0E22\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 6,
        margin: '4px 0 2px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 44,
        color: 'var(--navy-900)'
      }
    }, "\u0E3F18,400"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-500)'
      }
    }, "/ \u0E1B\u0E35")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: 'var(--green-600)',
        fontSize: 14,
        marginBottom: 18
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "trending-down",
      size: 16
    }), " \u0E1B\u0E23\u0E30\u0E2B\u0E22\u0E31\u0E14\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 \u0E3F3,200 \u0E40\u0E21\u0E37\u0E48\u0E2D\u0E02\u0E31\u0E1A\u0E14\u0E35\u0E01\u0E31\u0E1A PHYD"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      block: true,
      iconRight: "arrow-right",
      style: {
        marginBottom: 10
      }
    }, "\u0E0B\u0E37\u0E49\u0E2D\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E40\u0E25\u0E22"), /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "lg",
      block: true
    }, "\u0E02\u0E2D\u0E43\u0E1A\u0E40\u0E2A\u0E19\u0E2D\u0E23\u0E32\u0E04\u0E32"))))), /*#__PURE__*/React.createElement("section", {
      className: "aioi-container",
      style: {
        padding: '40px 24px 80px'
      }
    }, /*#__PURE__*/React.createElement(Tabs, {
      active: tab,
      onChange: setTab,
      tabs: [{
        id: 'cov',
        label: 'ความคุ้มครอง'
      }, {
        id: 'cond',
        label: 'เงื่อนไข'
      }, {
        id: 'faq',
        label: 'คำถามที่พบบ่อย'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 28
      }
    }, tab === 'cov' && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12
      }
    }, coverage.map((c, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 20px',
        background: '#fff',
        border: '1px solid var(--ink-100)',
        borderRadius: 'var(--radius-md)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--font-body)',
        fontSize: 16,
        color: 'var(--ink-800)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check-circle",
      size: 18,
      color: "var(--green-500)"
    }), " ", c.label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 15,
        color: 'var(--navy-800)',
        textAlign: 'right'
      }
    }, c.value)))), tab === 'cond' && /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 760,
        fontFamily: 'var(--font-body)',
        fontSize: 16,
        lineHeight: 1.8,
        color: 'var(--ink-700)'
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        marginTop: 0
      }
    }, "\u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02\u0E04\u0E27\u0E32\u0E21\u0E04\u0E38\u0E49\u0E21\u0E04\u0E23\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E44\u0E1B\u0E15\u0E32\u0E21\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E43\u0E19\u0E01\u0E23\u0E21\u0E18\u0E23\u0E23\u0E21\u0E4C \u0E1C\u0E39\u0E49\u0E40\u0E2D\u0E32\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E20\u0E31\u0E22\u0E04\u0E27\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E41\u0E25\u0E30\u0E02\u0E49\u0E2D\u0E22\u0E01\u0E40\u0E27\u0E49\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E15\u0E31\u0E14\u0E2A\u0E34\u0E19\u0E43\u0E08"), /*#__PURE__*/React.createElement("ul", {
      style: {
        paddingLeft: 20
      }
    }, /*#__PURE__*/React.createElement("li", null, "\u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E2D\u0E32\u0E22\u0E38\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 15 \u0E1B\u0E35 \u0E19\u0E31\u0E1A\u0E08\u0E32\u0E01\u0E1B\u0E35\u0E17\u0E35\u0E48\u0E08\u0E14\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19"), /*#__PURE__*/React.createElement("li", null, "\u0E04\u0E48\u0E32\u0E40\u0E2A\u0E35\u0E22\u0E2B\u0E32\u0E22\u0E2A\u0E48\u0E27\u0E19\u0E41\u0E23\u0E01 (Deductible) \u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19 0 \u0E1A\u0E32\u0E17 \u0E02\u0E36\u0E49\u0E19\u0E2D\u0E22\u0E39\u0E48\u0E01\u0E31\u0E1A\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01"), /*#__PURE__*/React.createElement("li", null, "\u0E04\u0E38\u0E49\u0E21\u0E04\u0E23\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E02\u0E31\u0E1A\u0E02\u0E35\u0E48\u0E17\u0E35\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E22\u0E34\u0E19\u0E22\u0E2D\u0E21\u0E08\u0E32\u0E01\u0E1C\u0E39\u0E49\u0E40\u0E2D\u0E32\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E20\u0E31\u0E22"), /*#__PURE__*/React.createElement("li", null, "\u0E23\u0E30\u0E22\u0E30\u0E40\u0E27\u0E25\u0E32\u0E04\u0E38\u0E49\u0E21\u0E04\u0E23\u0E2D\u0E07 1 \u0E1B\u0E35 \u0E19\u0E31\u0E1A\u0E08\u0E32\u0E01\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E01\u0E23\u0E21\u0E18\u0E23\u0E23\u0E21\u0E4C\u0E21\u0E35\u0E1C\u0E25\u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A"))), tab === 'faq' && /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 820
      }
    }, /*#__PURE__*/React.createElement(Accordion, {
      items: [{
        id: '1',
        question: 'ประกันชั้น 1 ต่างจากชั้น 2+ อย่างไร?',
        answer: 'ชั้น 1 คุ้มครองความเสียหายต่อตัวรถแม้ไม่มีคู่กรณี รวมถึงรถสูญหายและไฟไหม้ ส่วนชั้น 2+ คุ้มครองเฉพาะกรณีมีคู่กรณีเท่านั้น'
      }, {
        id: '2',
        question: 'สามารถเลือกซ่อมศูนย์ได้หรือไม่?',
        answer: 'ได้ แผนประกันชั้น 1 สามารถเลือกซ่อมศูนย์บริการมาตรฐานของผู้ผลิตได้ตามเงื่อนไข'
      }, {
        id: '3',
        question: 'มีค่าเสียหายส่วนแรกหรือไม่?',
        answer: 'ขึ้นอยู่กับแผนที่เลือก มีทั้งแบบไม่มีค่าเสียหายส่วนแรกและแบบที่มีส่วนลดเบี้ยเมื่อรับผิดชอบค่าเสียหายส่วนแรก'
      }]
    })))));
  }
  window.AioiProductPage = AioiProductPage;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ProductPage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Products.jsx
try { (() => {
(function () {
  const {
    Card,
    Button,
    Badge,
    Tabs
  } = window.AioiBangkokInsuranceDesignSystem_cf9069;
  function SectionHead({
    eyebrow,
    title,
    sub
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        maxWidth: 640,
        margin: '0 auto 38px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "t-overline"
    }, eyebrow), /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: '8px 0 10px',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 36,
        color: 'var(--navy-900)'
      }
    }, title), sub && /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-body)',
        fontSize: 18,
        lineHeight: 1.6,
        color: 'var(--ink-500)'
      }
    }, sub));
  }
  function AioiProducts({
    onSelect
  }) {
    const products = [{
      icon: 'car',
      accent: 'red',
      eyebrow: 'ประกันชั้น 1',
      title: 'ประกันรถยนต์ชั้น 1',
      body: 'คุ้มครองครบ ซ่อมห้าง–ซ่อมศูนย์ รวมน้ำท่วม ไฟไหม้ และภัยธรรมชาติ',
      tag: 'ขายดีที่สุด'
    }, {
      icon: 'activity',
      accent: 'navy',
      eyebrow: 'PHYD',
      title: 'Pay How You Drive',
      body: 'ประกันอัจฉริยะจาก Toyota & Aioi ขับดี ขับน้อย ยิ่งได้ส่วนลด',
      tag: 'ลดสูงสุด 30%'
    }, {
      icon: 'home',
      accent: 'navy',
      eyebrow: 'Happy Home',
      title: 'ประกันบ้าน Aioi Happy Home',
      body: 'เพราะบ้านคือสถานที่ที่สำคัญที่สุด ดูแลทั้งตัวบ้านและทรัพย์สิน',
      tag: null
    }, {
      icon: 'users',
      accent: 'red',
      eyebrow: 'Buddy P.A.',
      title: 'ประกันอุบัติเหตุส่วนบุคคล',
      body: 'จ่าย 1 คุ้มครองถึง 2 ประกันอุบัติเหตุสำหรับคุณและคนที่คุณรัก',
      tag: null
    }];
    return /*#__PURE__*/React.createElement("section", {
      style: {
        background: 'var(--surface-page)',
        padding: '80px 0'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "aioi-container"
    }, /*#__PURE__*/React.createElement(SectionHead, {
      eyebrow: "\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E31\u0E13\u0E11\u0E4C\u0E02\u0E2D\u0E07\u0E40\u0E23\u0E32",
      title: "\u0E41\u0E1C\u0E19\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E48\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E38\u0E13",
      sub: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E04\u0E27\u0E32\u0E21\u0E04\u0E38\u0E49\u0E21\u0E04\u0E23\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E15\u0E23\u0E07\u0E43\u0E08 \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E2B\u0E25\u0E31\u0E07\u0E01\u0E32\u0E23\u0E02\u0E32\u0E22\u0E17\u0E35\u0E48\u0E14\u0E39\u0E41\u0E25\u0E04\u0E38\u0E13\u0E17\u0E38\u0E01\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 20
      }
    }, products.map((p, i) => /*#__PURE__*/React.createElement(Card, {
      key: i,
      variant: "feature",
      accent: p.accent,
      icon: p.icon,
      eyebrow: p.eyebrow,
      title: p.title,
      onClick: () => onSelect && onSelect(p),
      footer: /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8
        }
      }, p.tag ? /*#__PURE__*/React.createElement(Badge, {
        tone: p.accent === 'red' ? 'red' : 'success',
        variant: "soft"
      }, p.tag) : /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 14,
          color: 'var(--navy-600)'
        }
      }, "\u0E14\u0E39\u0E41\u0E1C\u0E19"))
    }, p.body)))));
  }
  window.AioiProducts = AioiProducts;
  window.AioiSectionHead = SectionHead;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Products.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/QuickActions.jsx
try { (() => {
(function () {
  const {
    Icon
  } = window.AioiBangkokInsuranceDesignSystem_cf9069;
  function AioiQuickActions() {
    const actions = [{
      icon: 'shopping-cart',
      label: 'ซื้อประกันออนไลน์',
      sub: 'รับกรมธรรม์ทันที'
    }, {
      icon: 'file-text',
      label: 'แจ้งเคลม',
      sub: 'ออนไลน์ 24 ชม.'
    }, {
      icon: 'refresh-cw',
      label: 'ต่ออายุกรมธรรม์',
      sub: 'ง่ายใน 3 นาที'
    }, {
      icon: 'map-pin',
      label: 'ค้นหาอู่/ศูนย์',
      sub: 'ทั่วประเทศ'
    }];
    return /*#__PURE__*/React.createElement("section", {
      className: "aioi-container",
      style: {
        position: 'relative',
        marginTop: -44,
        zIndex: 5
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16
      }
    }, actions.map((a, i) => /*#__PURE__*/React.createElement("button", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        textAlign: 'left',
        background: '#fff',
        border: '1px solid var(--ink-100)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        padding: '18px 18px',
        cursor: 'pointer',
        transition: 'transform .16s ease, box-shadow .16s ease'
      },
      onMouseEnter: e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      },
      onMouseLeave: e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        flex: 'none',
        width: 52,
        height: 52,
        borderRadius: 'var(--radius-md)',
        background: 'var(--red-50)',
        color: 'var(--red-500)',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: a.icon,
      size: 26,
      stroke: 2
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        lineHeight: 1.3
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        display: 'block',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 16,
        color: 'var(--navy-900)'
      }
    }, a.label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--ink-500)'
      }
    }, a.sub))))));
  }
  window.AioiQuickActions = AioiQuickActions;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/QuickActions.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Services.jsx
try { (() => {
(function () {
  const {
    Button,
    Accordion,
    Icon
  } = window.AioiBangkokInsuranceDesignSystem_cf9069;
  function AioiServices() {
    const feats = [{
      icon: 'smartphone',
      title: 'แจ้งเคลมออนไลน์',
      body: 'แจ้งเคลมผ่าน Aioi Remote Survey ง่ายเพียง 4 ขั้นตอน'
    }, {
      icon: 'navigation',
      title: 'AIOI-Tracking',
      body: 'ติดตามการเดินทางของเจ้าหน้าที่เคลมแบบเรียลไทม์'
    }, {
      icon: 'wrench',
      title: 'เครือข่ายซ่อมมาตรฐาน',
      body: 'อู่และศูนย์ซ่อมคุณภาพกว่า 500 แห่งทั่วประเทศ'
    }, {
      icon: 'phone-call',
      title: 'ศูนย์ลูกค้าสัมพันธ์ 1292',
      body: 'พร้อมดูแลและให้คำปรึกษาตลอด 24 ชั่วโมง'
    }];
    return /*#__PURE__*/React.createElement("section", {
      style: {
        background: '#fff',
        padding: '80px 0'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "aioi-container"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 56,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        borderRadius: 'var(--radius-2xl)',
        overflow: 'hidden',
        background: 'var(--navy-900)',
        minHeight: 420
      }
    }, /*#__PURE__*/React.createElement("div", {
      "aria-hidden": "true",
      style: {
        position: 'absolute',
        inset: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -40,
        left: -60,
        width: 120,
        height: 'calc(100% + 80px)',
        background: 'var(--red-500)',
        transform: 'skewX(-18deg)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -40,
        left: 70,
        width: 30,
        height: 'calc(100% + 80px)',
        background: 'rgba(255,255,255,.08)',
        transform: 'skewX(-18deg)'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        padding: '40px 40px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        color: 'var(--red-400)'
      }
    }, "Aioi Remote Survey"), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: '10px 0 8px',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 30,
        color: '#fff'
      }
    }, "\u0E41\u0E08\u0E49\u0E07\u0E40\u0E04\u0E25\u0E21\u0E2A\u0E30\u0E14\u0E27\u0E01 \u0E2A\u0E1A\u0E32\u0E22", /*#__PURE__*/React.createElement("br", null), "\u0E23\u0E27\u0E14\u0E40\u0E23\u0E47\u0E27\u0E22\u0E34\u0E48\u0E07\u0E02\u0E36\u0E49\u0E19"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 16,
        lineHeight: 1.65,
        color: 'rgba(255,255,255,.8)',
        maxWidth: 360
      }
    }, "\u0E40\u0E1E\u0E35\u0E22\u0E07 4 \u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19 \u0E16\u0E48\u0E32\u0E22\u0E23\u0E39\u0E1B\u0E04\u0E27\u0E32\u0E21\u0E40\u0E2A\u0E35\u0E22\u0E2B\u0E32\u0E22 \u0E2A\u0E48\u0E07\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07 \u0E41\u0E25\u0E30\u0E23\u0E2D\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E01\u0E25\u0E31\u0E1A"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        margin: '24px 0 28px'
      }
    }, ['ถ่ายรูปรถที่เสียหาย', 'กรอกรายละเอียดเหตุการณ์', 'ส่งเรื่องแจ้งเคลม', 'รอเจ้าหน้าที่ติดต่อกลับ'].map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: '#fff'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        flex: 'none',
        width: 30,
        height: 30,
        borderRadius: '999px',
        background: 'var(--red-500)',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 15
      }
    }, i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 16
      }
    }, s)))), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      shape: "pill",
      iconRight: "arrow-right"
    }, "\u0E41\u0E08\u0E49\u0E07\u0E40\u0E04\u0E25\u0E21\u0E40\u0E25\u0E22"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "t-overline"
    }, "\u0E17\u0E33\u0E44\u0E21\u0E15\u0E49\u0E2D\u0E07 Aioi"), /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: '8px 0 28px',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 34,
        color: 'var(--navy-900)'
      }
    }, "\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E14\u0E39\u0E41\u0E25\u0E04\u0E38\u0E13", /*#__PURE__*/React.createElement("br", null), "\u0E17\u0E38\u0E01\u0E01\u0E32\u0E23\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 22
      }
    }, feats.map((f, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        flex: 'none',
        width: 50,
        height: 50,
        borderRadius: 'var(--radius-md)',
        background: 'var(--navy-50)',
        color: 'var(--navy-700)',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: f.icon,
      size: 26,
      stroke: 2
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
      style: {
        margin: '2px 0 4px',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 19,
        color: 'var(--navy-900)'
      }
    }, f.title), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-body)',
        fontSize: 15,
        lineHeight: 1.6,
        color: 'var(--ink-500)'
      }
    }, f.body)))))))));
  }
  function AioiFaq() {
    const {
      AioiSectionHead
    } = window;
    return /*#__PURE__*/React.createElement("section", {
      style: {
        background: 'var(--surface-page)',
        padding: '80px 0'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "aioi-container",
      style: {
        maxWidth: 820
      }
    }, /*#__PURE__*/React.createElement(AioiSectionHead, {
      eyebrow: "\u0E04\u0E33\u0E16\u0E32\u0E21\u0E17\u0E35\u0E48\u0E1E\u0E1A\u0E1A\u0E48\u0E2D\u0E22",
      title: "\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E16\u0E32\u0E21\u0E1A\u0E48\u0E2D\u0E22"
    }), /*#__PURE__*/React.createElement(Accordion, {
      items: [{
        id: '1',
        question: 'แจ้งเคลมได้อย่างไรบ้าง?',
        answer: 'คุณสามารถแจ้งเคลมผ่านแอป Aioi Remote Survey เพียง 4 ขั้นตอน หรือโทรศูนย์ลูกค้าสัมพันธ์ 1292 ได้ตลอด 24 ชั่วโมง'
      }, {
        id: '2',
        question: 'ประกันชั้น 1 คุ้มครองภัยน้ำท่วมหรือไม่?',
        answer: 'ประกันชั้น 1 ของไอโออิ กรุงเทพ ประกันภัย คุ้มครองความเสียหายจากภัยน้ำท่วมและภัยธรรมชาติตามเงื่อนไขที่ระบุในกรมธรรม์'
      }, {
        id: '3',
        question: 'PHYD คำนวณส่วนลดอย่างไร?',
        answer: 'Pay How You Drive ใช้ข้อมูลพฤติกรรมการขับขี่จริงผ่านเทคโนโลยี T Connect ยิ่งขับดี ขับน้อย ยิ่งได้ส่วนลดเบี้ยประกันสูงสุดถึง 30%'
      }, {
        id: '4',
        question: 'สามารถผ่อนชำระเบี้ยประกันได้หรือไม่?',
        answer: 'สามารถผ่อนชำระได้สูงสุด 6 งวด ผ่านบัตรเครดิตที่ร่วมรายการ โดยไม่มีดอกเบี้ย'
      }]
    })));
  }
  function AioiCta() {
    return /*#__PURE__*/React.createElement("section", {
      style: {
        position: 'relative',
        background: 'var(--red-500)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      "aria-hidden": "true",
      style: {
        position: 'absolute',
        top: -40,
        right: -80,
        width: '40%',
        height: 'calc(100% + 80px)',
        background: 'var(--red-600)',
        transform: 'skewX(-18deg)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "aioi-container",
      style: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 30,
        padding: '48px 24px'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: '0 0 6px',
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 32,
        color: '#fff'
      }
    }, "\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E14\u0E39\u0E41\u0E25\u0E04\u0E38\u0E13\u0E41\u0E25\u0E49\u0E27\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-body)',
        fontSize: 18,
        color: 'rgba(255,255,255,.9)'
      }
    }, "\u0E23\u0E31\u0E1A\u0E43\u0E1A\u0E40\u0E2A\u0E19\u0E2D\u0E23\u0E32\u0E04\u0E32\u0E20\u0E32\u0E22\u0E43\u0E19 1 \u0E19\u0E32\u0E17\u0E35 \u2014 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E1C\u0E39\u0E01\u0E21\u0E31\u0E14")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "navy",
      size: "lg",
      iconRight: "arrow-right"
    }, "\u0E40\u0E0A\u0E47\u0E04\u0E40\u0E1A\u0E35\u0E49\u0E22\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19"), /*#__PURE__*/React.createElement(Button, {
      size: "lg",
      iconLeft: "phone",
      style: {
        background: '#fff',
        color: 'var(--red-600)'
      }
    }, "\u0E42\u0E17\u0E23 1292"))), /*#__PURE__*/React.createElement("div", {
      className: "aioi-edge-stripe"
    }));
  }
  window.AioiServices = AioiServices;
  window.AioiFaq = AioiFaq;
  window.AioiCta = AioiCta;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Services.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Accordion = __ds_scope.Accordion;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
