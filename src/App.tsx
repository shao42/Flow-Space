import { useEffect } from 'react';
import { useFlowStore } from './store/flowStore';
import { useAudioSync } from './hooks/useAudioSync';
import { AtmosphereCanvas } from './components/AtmosphereCanvas';
import { EditorDeck } from './components/EditorDeck';
import { TopModeStrip } from './components/TopModeStrip';
import { VibeMixer } from './components/VibeMixer';
import { ZenTimer } from './components/ZenTimer';
import { ChromeActions } from './components/ChromeActions';
import { MusicPlaylistPanel } from './components/MusicPlaylistPanel';
import { ConfirmReleaseModal } from './components/ConfirmReleaseModal';

function App() {
  useAudioSync();
  const storageError = useFlowStore((s) => s.storageError);
  const saveToast = useFlowStore((s) => s.saveToast);
  const clearStorageError = useFlowStore((s) => s.clearStorageError);
  const hydrate = useFlowStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="fs-root">
      {storageError && (
        <div className="fs-storage-banner" role="status">
          <span>{storageError}</span>
          <button type="button" onClick={clearStorageError}>
            关闭
          </button>
        </div>
      )}
      {saveToast && (
        <div className="fs-toast" role="status">
          {saveToast}
        </div>
      )}
      <AtmosphereCanvas />
      <div className="fs-vignette" aria-hidden />
      <TopModeStrip />
      <EditorDeck />
      <VibeMixer />
      <ZenTimer />
      <ChromeActions />
      <MusicPlaylistPanel />
      <ConfirmReleaseModal />
    </div>
  );
}

export default App;
