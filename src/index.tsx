import { ButtonItem, PanelSection, PanelSectionRow, SliderField, ToggleField, staticClasses } from '@decky/ui';
import { callable, definePlugin } from '@decky/api';
import { useEffect, useRef, useState } from 'react';
import { FaGamepad } from 'react-icons/fa';
import { startGameTracking } from './game-tracking';

type Status = { active_game: {id: string; name: string} | null; custom_profile: boolean; default_strength: number; enabled: boolean; strength: number; running: boolean; ready: boolean; trigger_requests: number; error: string };
const getStatus = callable<[], Status>('get_status');
const setOptions = callable<[enabled: boolean, strength: number, preview: boolean, expectedAppId: string | null], Status>('set_options');
const getLaunchOption = callable<[], string>('get_launch_option');
const stopBridge = callable<[], Status>('stop_bridge');
const resetGameProfile = callable<[appId: string], Status>('reset_game_profile');

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
  const update = async (enabled: boolean, value: number, preview = false, expectedAppId: string | null = latest.current?.active_game?.id ?? null) => {
    if (timer.current) clearTimeout(timer.current);
    revision.current++; changing.current = true; setBusy(true); setError('');
    try { const result = await setOptions(enabled, value, preview, expectedAppId); if (active.current) accept(result); }
    catch (e) { if (active.current) setError(String(e)); }
    finally { changing.current = false; if (active.current) setBusy(false); }
  };
  const toggleHaptics = async (enabled: boolean) => {
    if (enabled) { await update(true, strength); return; }
    if (timer.current) clearTimeout(timer.current);
    const context = latest.current?.active_game?.id ?? null;
    revision.current++; changing.current = true; setBusy(true); setError('');
    try {
      // Preserve the selected strength, then reuse the existing backend stop path.
      await setOptions(false, strength, false, context);
      const result = await stopBridge();
      if (active.current) accept(result);
    } catch(e) { if (active.current) setError(String(e)); }
    finally { changing.current = false; if (active.current) setBusy(false); }
  };
  return <PanelSection title="Impulse triggers">
    <PanelSectionRow><ToggleField label="Trigger Haptics" checked={status?.enabled ?? false}
      disabled={busy || !status}
      onChange={(value) => void toggleHaptics(value)} /></PanelSectionRow>
    <PanelSectionRow><SliderField label="Trigger strength" value={strength} min={0} max={100} step={5}
      showValue valueSuffix="%" disabled={busy || !status}
      onChange={(value) => {
        setStrength(value); revision.current++; changing.current = true;
        if (timer.current) clearTimeout(timer.current);
        const context = latest.current?.active_game?.id ?? null;
        const enabled = latest.current?.enabled ?? false;
        timer.current = setTimeout(() => void update(enabled, value, true, context), 250);
      }} /></PanelSectionRow>
    <PanelSectionRow><div style={{fontSize: '13px', lineHeight: 1.5}}>
      <div>Active profile: <strong>{status?.active_game?.name ?? 'Default profile'}</strong></div>
      <div>{status?.active_game
        ? (status.custom_profile ? 'Saved settings for this game. Changes save automatically.' : 'Using your default. Changing a setting saves a profile for this game.')
        : 'Used when no game is running and by games without saved settings.'}</div>
    </div></PanelSectionRow>
    {status?.active_game && status.custom_profile && <PanelSectionRow><ButtonItem layout="below" disabled={busy}
      description="Remove this game’s saved settings and use your default profile."
      onClick={async () => {
        const id = latest.current?.active_game?.id; if (!id) return;
        if (timer.current) clearTimeout(timer.current);
        revision.current++; changing.current = true; setBusy(true); setError('');
        try { accept(await resetGameProfile(id)); } catch(e) { setError(String(e)); }
        finally { changing.current = false; setBusy(false); }
      }}>Use default for this game</ButtonItem></PanelSectionRow>}
    <PanelSectionRow><div style={{fontSize: '13px', lineHeight: 1.5}}>
      {status?.ready ? 'Controller connected' : status?.running ? 'Starting controller…' : 'Controller bridge stopped'}
      {status?.ready && <div>{status.trigger_requests > 0 ? 'Trigger feedback received this session' : 'Waiting for game trigger feedback'}</div>}
      <div>M1 → R3 · M2 → L3</div>
      <div>Library → Quick Access Menu</div>
      {(error || status?.error) && <div style={{color: '#ffb4ab', marginTop: '8px'}}>{error || status?.error}</div>}
    </div></PanelSectionRow>
    <PanelSectionRow><ButtonItem layout="below" disabled={!launchOption}
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
    <PanelSectionRow><div style={{fontSize: '13px', lineHeight: 1.5}}>
      <div>Paste into your game’s Properties → General → Launch Options in Steam.</div>
      <div>Disable Steam Input under Properties → Controller.</div>
    </div></PanelSectionRow>
    {copyNote && <PanelSectionRow><div style={{fontSize: '12px', overflowWrap: 'anywhere'}}>
      <div>{copyNote}</div><div style={{userSelect: 'text', marginTop: '6px'}}>{launchOption}</div>
      <div style={{marginTop: '6px'}}>Keep a copy of existing launch options before editing them.</div>
    </div></PanelSectionRow>}

  </PanelSection>;
}
export default definePlugin(() => {
  const stopTracking = startGameTracking();
  return ({
  name: 'Ally Impulse',
  titleView: <div className={staticClasses.Title}>Ally Impulse</div>,
  content: <Content />,
  icon: <FaGamepad />,
  onDismount() { stopTracking(); },
});
});
