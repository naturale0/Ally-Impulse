import { ButtonItem, PanelSection, PanelSectionRow, SliderField, ToggleField, staticClasses } from '@decky/ui';
import { callable, definePlugin } from '@decky/api';
import { useEffect, useRef, useState } from 'react';
import { FaGamepad } from 'react-icons/fa';

type Status = { enabled: boolean; strength: number; running: boolean; ready: boolean; trigger_requests: number; error: string };
const getStatus = callable<[], Status>('get_status');
const setOptions = callable<[enabled: boolean, strength: number, preview: boolean], Status>('set_options');
const getLaunchOption = callable<[], string>('get_launch_option');
const stopBridge = callable<[], Status>('stop_bridge');

function Content() {
  const [status, setStatus] = useState<Status>();
  const [strength, setStrength] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [launchOption, setLaunchOption] = useState('');
  const [copyNote, setCopyNote] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const active = useRef(true);
  const changing = useRef(false);
  const latest = useRef<Status | undefined>(undefined);
  const revision = useRef(0);
  const accept = (value: Status) => { latest.current = value; setStatus(value); setStrength(value.strength); };
  useEffect(() => {
    active.current = true;
    const refresh = async () => {
      const before = revision.current;
      try { const value = await getStatus(); if (active.current && !changing.current && before === revision.current) accept(value); }
      catch (e) { if (active.current) setError(String(e)); }
    };
    void refresh();
    void getLaunchOption().then(value => { if (active.current) setLaunchOption(value); }).catch(e => { if (active.current) setCopyNote(String(e)); });
    const interval = setInterval(refresh, 2000);
    return () => { active.current = false; clearInterval(interval); if (timer.current) clearTimeout(timer.current); };
  }, []);
  const update = async (enabled: boolean, value: number, preview = false) => {
    if (timer.current) clearTimeout(timer.current);
    revision.current++; changing.current = true; setBusy(true); setError('');
    try { const result = await setOptions(enabled, value, preview); if (active.current) accept(result); }
    catch (e) { if (active.current) setError(String(e)); }
    finally { changing.current = false; if (active.current) setBusy(false); }
  };
  return <PanelSection title="Impulse triggers">
    <PanelSectionRow><ToggleField label="Enable trigger vibration" checked={status?.enabled ?? false}
      disabled={busy || !status} description="Use independent feedback requested by the game."
      onChange={(value) => void update(value, strength)} /></PanelSectionRow>
    <PanelSectionRow><SliderField label="Trigger strength" value={strength} min={0} max={100} step={5}
      showValue valueSuffix="%" disabled={busy || !status}
      description="A brief preview plays at this strength when enabled. 0% is silent."
      onChange={(value) => {
        setStrength(value); revision.current++; changing.current = true;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void update(latest.current?.enabled ?? false, value, true), 250);
      }} /></PanelSectionRow>
    <PanelSectionRow><div style={{fontSize: '13px', lineHeight: 1.5}}>
      {status?.ready ? 'Controller connected' : status?.running ? 'Starting controller…' : 'Controller bridge stopped'}
      {status?.ready && <div>{status.trigger_requests > 0 ? 'Trigger feedback received this session' : 'Waiting for game trigger feedback'}</div>}
      <div>M1 → R3 · M2 → L3</div>
      <div>Library → Quick Access Menu</div>
      <div>Disable Steam Input for the game. Some games also need the included launch option.</div>
      {(error || status?.error) && <div style={{color: '#ffb4ab', marginTop: '8px'}}>{error || status?.error}</div>}
    </div></PanelSectionRow>
    <PanelSectionRow><ButtonItem layout="below" disabled={!launchOption}
      description="Paste into your game’s Properties → General → Launch Options in Steam. Disable Steam Input under Properties → Controller."
      onClick={async () => {
        setCopyNote('');
        try {
          let copied = false;
          if (navigator.clipboard?.writeText) {
            try { await navigator.clipboard.writeText(launchOption); copied = true; } catch { /* Try Steam CEF's selection clipboard. */ }
          }
          if (!copied) {
            const previous = document.activeElement as HTMLElement | null;
            const input = document.createElement('textarea');
            input.value = launchOption;
            input.style.position = 'fixed'; input.style.opacity = '0';
            document.body.appendChild(input);
            try { input.focus(); input.select(); copied = document.execCommand('copy'); }
            finally { input.remove(); previous?.focus(); }
          }
          setCopyNote(copied ? 'Copied. Paste it into Launch Options.' : 'Copy unavailable. The launch option is shown below.');
        } catch(e) { setCopyNote('Could not copy: ' + String(e)); }
      }}>Copy launch option</ButtonItem></PanelSectionRow>
    {copyNote && <PanelSectionRow><div style={{fontSize: '12px', overflowWrap: 'anywhere'}}>
      <div>{copyNote}</div><div style={{userSelect: 'text', marginTop: '6px'}}>{launchOption}</div>
      <div style={{marginTop: '6px'}}>Keep a copy of existing launch options before editing them.</div>
    </div></PanelSectionRow>}
    {status?.running && <PanelSectionRow><ButtonItem layout="below" disabled={busy}
      description="Exit your game first. This restores the original controller."
      onClick={async () => {
        if (timer.current) clearTimeout(timer.current);
        revision.current++; changing.current = true; setBusy(true);
        try { accept(await stopBridge()); } catch(e) { setError(String(e)); }
        finally { changing.current = false; setBusy(false); }
      }}>Stop controller bridge</ButtonItem></PanelSectionRow>}
  </PanelSection>;
}
export default definePlugin(() => ({
  name: 'Ally Impulse',
  titleView: <div className={staticClasses.Title}>Ally Impulse</div>,
  content: <Content />,
  icon: <FaGamepad />,
  onDismount() {},
}));
