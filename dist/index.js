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

const setActiveGame = callable('set_active_game');
const idOf = (value) => {
    if ((typeof value !== 'number' && typeof value !== 'string') || value === '')
        return null;
    let n = Number(value);
    if (Number.isInteger(n) && n < 0 && n >= -2147483648)
        n = n >>> 0;
    return Number.isInteger(n) && n > 0 && n <= 0xffffffff ? String(n) : null;
};
// Installed once per plugin load, outside the panel's React lifecycle.
function startGameTracking() {
    const instances = new Map();
    const stopped = new Map();
    let disposed = false;
    let emptyReads = 0;
    let desired = null;
    let sent;
    let busy = false;
    let dirty = false;
    let subscription;
    const globals = () => window;
    const game = (id, name) => {
        if (!name) {
            try {
                name = globals().appStore?.GetAppOverviewByAppID?.(Number(id))?.display_name;
            }
            catch { /* Use ID. */ }
        }
        return { id, name: name || `Game ${id}` };
    };
    const drain = async () => {
        if (busy || disposed)
            return;
        busy = true;
        try {
            while (dirty && !disposed) {
                dirty = false;
                const target = desired;
                const key = JSON.stringify(target);
                if (sent === key)
                    continue;
                try {
                    await setActiveGame(target?.id ?? null, target?.name ?? '');
                    sent = key;
                }
                catch (e) {
                    console.warn('Ally Impulse game profile selection failed', e);
                }
            }
        }
        finally {
            busy = false;
        }
    };
    const publish = (target) => { desired = target; dirty = true; void drain(); };
    const reconcile = (explicitStop = false) => {
        if (disposed)
            return;
        let available = false;
        try {
            const store = globals().SteamUIStore;
            if (store) {
                const apps = store.RunningApps;
                available = Array.isArray(apps);
                const candidates = [store.MainRunningApp, ...(Array.isArray(apps) ? apps : [])];
                const mainId = idOf(store.MainRunningAppID);
                if (mainId)
                    candidates.unshift({ appid: mainId });
                for (const app of candidates) {
                    const id = idOf(app?.appid);
                    if (!id || Date.now() - (stopped.get(id) ?? 0) < 3000)
                        continue;
                    emptyReads = 0;
                    publish(game(id, app?.display_name));
                    return;
                }
            }
        }
        catch { /* Lifetime notifications remain the fallback. */ }
        const ids = [...instances.keys()];
        if (ids.length) {
            emptyReads = 0;
            publish(game(ids[ids.length - 1]));
            return;
        }
        // Briefly empty running-app lists can occur during SteamUI transitions.
        if (explicitStop || (available && ++emptyReads >= 3))
            publish(null);
    };
    try {
        subscription = SteamClient.GameSessions.RegisterForAppLifetimeNotifications(event => {
            const id = idOf(event.unAppID);
            if (!id)
                return;
            if (event.bRunning) {
                stopped.delete(id);
                const set = instances.get(id) ?? new Set();
                set.add(event.nInstanceID);
                instances.delete(id);
                instances.set(id, set);
                emptyReads = 0;
                publish(game(id));
            }
            else {
                const set = instances.get(id);
                if (set) {
                    set.delete(event.nInstanceID);
                    if (!set.size)
                        instances.delete(id);
                }
                if (!instances.has(id))
                    stopped.set(id, Date.now());
                reconcile(desired?.id === id && !instances.has(id));
            }
        });
    }
    catch (e) {
        console.warn('Ally Impulse game events unavailable; using running-app polling', e);
    }
    reconcile();
    const interval = setInterval(() => reconcile(), 1000);
    return () => {
        disposed = true;
        clearInterval(interval);
        try {
            subscription?.unregister();
        }
        catch { /* Steam may be shutting down. */ }
    };
}

const getStatus = callable('get_status');
const setOptions = callable('set_options');
const getLaunchOption = callable('get_launch_option');
const stopBridge = callable('stop_bridge');
const resetGameProfile = callable('reset_game_profile');
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
    const update = async (enabled, value, preview = false, expectedAppId = latest.current?.active_game?.id ?? null) => {
        if (timer.current)
            clearTimeout(timer.current);
        revision.current++;
        changing.current = true;
        setBusy(true);
        setError('');
        try {
            const result = await setOptions(enabled, value, preview, expectedAppId);
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
    const toggleHaptics = async (enabled) => {
        if (enabled) {
            await update(true, strength);
            return;
        }
        if (timer.current)
            clearTimeout(timer.current);
        const context = latest.current?.active_game?.id ?? null;
        revision.current++;
        changing.current = true;
        setBusy(true);
        setError('');
        try {
            // Preserve the selected strength, then reuse the existing backend stop path.
            await setOptions(false, strength, false, context);
            const result = await stopBridge();
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
    return SP_JSX.jsxs(DFL.PanelSection, { title: "Impulse triggers", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "Trigger Haptics", checked: status?.enabled ?? false, disabled: busy || !status, onChange: (value) => void toggleHaptics(value) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.SliderField, { label: "Haptics stength", value: strength, min: 0, max: 100, step: 5, showValue: true, valueSuffix: "%", disabled: busy || !status, onChange: (value) => {
                        setStrength(value);
                        revision.current++;
                        changing.current = true;
                        if (timer.current)
                            clearTimeout(timer.current);
                        const context = latest.current?.active_game?.id ?? null;
                        const enabled = latest.current?.enabled ?? false;
                        timer.current = setTimeout(() => void update(enabled, value, true, context), 250);
                    } }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: '13px', lineHeight: 1.5 }, children: [SP_JSX.jsxs("div", { children: ["Active profile: ", SP_JSX.jsx("strong", { children: status?.active_game?.name ?? 'Default profile' })] }), SP_JSX.jsx("div", { children: status?.active_game
                                ? (status.custom_profile ? 'Saved settings for this game. Changes save automatically.' : 'Using your default. Changing a setting saves a profile for this game.')
                                : 'Used when no game is running and by games without saved settings.' })] }) }), status?.active_game && status.custom_profile && SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: async () => {
                                const id = latest.current?.active_game?.id;
                                if (!id)
                                    return;
                                if (timer.current)
                                    clearTimeout(timer.current);
                                revision.current++;
                                changing.current = true;
                                setBusy(true);
                                setError('');
                                try {
                                    accept(await resetGameProfile(id));
                                }
                                catch (e) {
                                    setError(String(e));
                                }
                                finally {
                                    changing.current = false;
                                    setBusy(false);
                                }
                            }, children: "Use default for this game" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: '13px', lineHeight: 1.5 }, children: "Remove this game\u2019s saved settings and use your default profile." }) })] }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: '13px', lineHeight: 1.5 }, children: [status?.ready ? 'Controller connected' : status?.running ? 'Starting controller…' : 'Controller bridge stopped', status?.ready && SP_JSX.jsx("div", { children: status.trigger_requests > 0 ? 'Trigger feedback received this session' : 'Waiting for game trigger feedback' }), SP_JSX.jsx("div", { children: "M1 \u2192 R3 \u00B7 M2 \u2192 L3" }), SP_JSX.jsx("div", { children: "Library \u2192 Quick Access Menu" }), (error || status?.error) && SP_JSX.jsx("div", { style: { color: '#ffb4ab', marginTop: '8px' }, children: error || status?.error })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: !launchOption, onClick: async () => {
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
                            setCopyNote(copied ? 'Copied. Paste it into Launch Options.' : 'Copy unavailable. Select the launch-option field to copy it manually.');
                        }
                        catch (e) {
                            setCopyNote('Could not copy: ' + String(e));
                        }
                    }, children: "Copy launch option" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { width: '100%', minWidth: 0 }, children: SP_JSX.jsx("textarea", { "aria-label": "Launch option (read only)", readOnly: true, rows: 1, wrap: "off", value: launchOption, placeholder: "Loading launch option\u2026", spellCheck: false, style: { display: 'block', width: '100%', boxSizing: 'border-box', height: '52px',
                            resize: 'none', overflowX: 'auto', overflowY: 'hidden', whiteSpace: 'pre',
                            userSelect: 'text', fontFamily: 'monospace', fontSize: '12px', lineHeight: '18px',
                            padding: '8px', border: '1px solid #53657a', borderRadius: '4px',
                            background: '#17212e', color: '#eef4fa' } }) }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: '13px', lineHeight: 1.5 }, children: [SP_JSX.jsx("div", { children: "Paste into your game\u2019s Properties \u2192 General \u2192 Launch Options in Steam." }), SP_JSX.jsx("div", { children: "Disable Steam Input under Properties \u2192 Controller." })] }) }), copyNote && SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: '12px', overflowWrap: 'anywhere' }, children: [SP_JSX.jsx("div", { children: copyNote }), SP_JSX.jsx("div", { style: { marginTop: '6px' }, children: "Keep a copy of existing launch options before editing them." })] }) })] });
}
var index = definePlugin(() => {
    const stopTracking = startGameTracking();
    return ({
        name: 'Ally Impulse',
        titleView: SP_JSX.jsx("div", { className: DFL.staticClasses.Title, children: "Ally Impulse" }),
        content: SP_JSX.jsx(Content, {}),
        icon: SP_JSX.jsx(FaGamepad, {}),
        onDismount() { stopTracking(); },
    });
});

export { index as default };
//# sourceMappingURL=index.js.map
