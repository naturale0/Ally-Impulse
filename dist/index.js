const manifest = {"name":"Ally Impulse"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const callable = api.callable;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = SP_REACT.createContext && /*#__PURE__*/SP_REACT.createContext(DefaultContext);

var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }
function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } } return target; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /*#__PURE__*/SP_REACT.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return props => /*#__PURE__*/SP_REACT.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var {
        attr,
        size,
        title
      } = props,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /*#__PURE__*/SP_REACT.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/SP_REACT.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/SP_REACT.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FaGamepad (props) {
  return GenIcon({"attr":{"viewBox":"0 0 640 512"},"child":[{"tag":"path","attr":{"d":"M480.07 96H160a160 160 0 1 0 114.24 272h91.52A160 160 0 1 0 480.07 96zM248 268a12 12 0 0 1-12 12h-52v52a12 12 0 0 1-12 12h-24a12 12 0 0 1-12-12v-52H84a12 12 0 0 1-12-12v-24a12 12 0 0 1 12-12h52v-52a12 12 0 0 1 12-12h24a12 12 0 0 1 12 12v52h52a12 12 0 0 1 12 12zm216 76a40 40 0 1 1 40-40 40 40 0 0 1-40 40zm64-96a40 40 0 1 1 40-40 40 40 0 0 1-40 40z"},"child":[]}]})(props);
}

const getStatus = callable('get_status');
const setOptions = callable('set_options');
const getLaunchOption = callable('get_launch_option');
const stopBridge = callable('stop_bridge');
function Content() {
    const [status, setStatus] = SP_REACT.useState();
    const [strength, setStrength] = SP_REACT.useState(100);
    const [busy, setBusy] = SP_REACT.useState(false);
    const [error, setError] = SP_REACT.useState('');
    const [launchOption, setLaunchOption] = SP_REACT.useState('');
    const [copyNote, setCopyNote] = SP_REACT.useState('');
    const timer = SP_REACT.useRef(undefined);
    const active = SP_REACT.useRef(true);
    const changing = SP_REACT.useRef(false);
    const latest = SP_REACT.useRef(undefined);
    const revision = SP_REACT.useRef(0);
    const accept = (value) => { latest.current = value; setStatus(value); setStrength(value.strength); };
    SP_REACT.useEffect(() => {
        active.current = true;
        const refresh = async () => {
            const before = revision.current;
            try {
                const value = await getStatus();
                if (active.current && !changing.current && before === revision.current)
                    accept(value);
            }
            catch (e) {
                if (active.current)
                    setError(String(e));
            }
        };
        void refresh();
        void getLaunchOption().then(value => { if (active.current)
            setLaunchOption(value); }).catch(e => { if (active.current)
            setCopyNote(String(e)); });
        const interval = setInterval(refresh, 2000);
        return () => { active.current = false; clearInterval(interval); if (timer.current)
            clearTimeout(timer.current); };
    }, []);
    const update = async (enabled, value, preview = false) => {
        if (timer.current)
            clearTimeout(timer.current);
        revision.current++;
        changing.current = true;
        setBusy(true);
        setError('');
        try {
            const result = await setOptions(enabled, value, preview);
            if (active.current)
                accept(result);
        }
        catch (e) {
            if (active.current)
                setError(String(e));
        }
        finally {
            changing.current = false;
            if (active.current)
                setBusy(false);
        }
    };
    return SP_JSX.jsxs(DFL.PanelSection, { title: "Impulse triggers", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "Enable trigger vibration", checked: status?.enabled ?? false, disabled: busy || !status, description: "Use independent feedback requested by the game.", onChange: (value) => void update(value, strength) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.SliderField, { label: "Trigger strength", value: strength, min: 0, max: 100, step: 5, showValue: true, valueSuffix: "%", disabled: busy || !status, description: "A brief preview plays at this strength when enabled. 0% is silent.", onChange: (value) => {
                        setStrength(value);
                        revision.current++;
                        changing.current = true;
                        if (timer.current)
                            clearTimeout(timer.current);
                        timer.current = setTimeout(() => void update(latest.current?.enabled ?? false, value, true), 250);
                    } }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: '13px', lineHeight: 1.5 }, children: [status?.ready ? 'Controller connected' : status?.running ? 'Starting controller…' : 'Controller bridge stopped', status?.ready && SP_JSX.jsx("div", { children: status.trigger_requests > 0 ? 'Trigger feedback received this session' : 'Waiting for game trigger feedback' }), SP_JSX.jsx("div", { children: "M1 \u2192 R3 \u00B7 M2 \u2192 L3" }), SP_JSX.jsx("div", { children: "Library \u2192 Quick Access Menu" }), SP_JSX.jsx("div", { children: "Disable Steam Input for the game. Some games also need the included launch option." }), (error || status?.error) && SP_JSX.jsx("div", { style: { color: '#ffb4ab', marginTop: '8px' }, children: error || status?.error })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: !launchOption, description: "Paste into your game\u2019s Properties \u2192 General \u2192 Launch Options in Steam. Disable Steam Input under Properties \u2192 Controller.", onClick: async () => {
                        setCopyNote('');
                        try {
                            let copied = false;
                            if (navigator.clipboard?.writeText) {
                                try {
                                    await navigator.clipboard.writeText(launchOption);
                                    copied = true;
                                }
                                catch { /* Try Steam CEF's selection clipboard. */ }
                            }
                            if (!copied) {
                                const previous = document.activeElement;
                                const input = document.createElement('textarea');
                                input.value = launchOption;
                                input.style.position = 'fixed';
                                input.style.opacity = '0';
                                document.body.appendChild(input);
                                try {
                                    input.focus();
                                    input.select();
                                    copied = document.execCommand('copy');
                                }
                                finally {
                                    input.remove();
                                    previous?.focus();
                                }
                            }
                            setCopyNote(copied ? 'Copied. Paste it into Launch Options.' : 'Copy unavailable. The launch option is shown below.');
                        }
                        catch (e) {
                            setCopyNote('Could not copy: ' + String(e));
                        }
                    }, children: "Copy launch option" }) }), copyNote && SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: '12px', overflowWrap: 'anywhere' }, children: [SP_JSX.jsx("div", { children: copyNote }), SP_JSX.jsx("div", { style: { userSelect: 'text', marginTop: '6px' }, children: launchOption }), SP_JSX.jsx("div", { style: { marginTop: '6px' }, children: "Keep a copy of existing launch options before editing them." })] }) }), status?.running && SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, description: "Exit your game first. This restores the original controller.", onClick: async () => {
                        if (timer.current)
                            clearTimeout(timer.current);
                        revision.current++;
                        changing.current = true;
                        setBusy(true);
                        try {
                            accept(await stopBridge());
                        }
                        catch (e) {
                            setError(String(e));
                        }
                        finally {
                            changing.current = false;
                            setBusy(false);
                        }
                    }, children: "Stop controller bridge" }) })] });
}
var index = definePlugin(() => ({
    name: 'Ally Impulse',
    titleView: SP_JSX.jsx("div", { className: DFL.staticClasses.Title, children: "Ally Impulse" }),
    content: SP_JSX.jsx(Content, {}),
    icon: SP_JSX.jsx(FaGamepad, {}),
    onDismount() { },
}));

export { index as default };
//# sourceMappingURL=index.js.map
