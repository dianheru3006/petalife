import { useState, useEffect, type FormEvent } from 'react';
import {
  getEffectiveGatewayUrl,
  saveBrainGatewayUrl,
  clearStoredBrainGatewayUrl,
  testGatewayConnection,
  getLastSuccessfulSynthesis,
  type GatewayDiagnostic,
  DEFAULT_BRAIN_GATEWAY_URL,
} from '../../lib/services/brainGatewaySettings';
import { purgePetalifeShellCacheAndReload } from '../../registerServiceWorker';
import { Activity, RefreshCw, Trash2, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function SettingsPage() {
  const [effective, setEffective] = useState(() => getEffectiveGatewayUrl());
  const [inputUrl, setInputUrl] = useState(() => effective.source === 'localStorage' ? effective.url : '');
  const [message, setMessage] = useState('');
  const [diagnostic, setDiagnostic] = useState<GatewayDiagnostic | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const lastSynthesis = getLastSuccessfulSynthesis();

  // Test connection on mount or when effective URL changes
  useEffect(() => {
    runConnectionTest();
  }, [effective.url]);

  const runConnectionTest = async () => {
    setIsTesting(true);
    try {
      const diag = await testGatewayConnection(effective.url || undefined, 3000);
      setDiagnostic(diag);
    } catch {
      setDiagnostic({
        reachable: false,
        latencyMs: 0,
        status: 0,
        statusText: 'Gagal',
        effectiveUrl: effective.url,
        source: effective.source,
        authenticated: false,
        errorMessage: 'Terjadi kesalahan saat menguji koneksi.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    if (!inputUrl.trim()) {
      clearStoredBrainGatewayUrl();
      const eff = getEffectiveGatewayUrl();
      setEffective(eff);
      setInputUrl(eff.source === 'localStorage' ? eff.url : '');
      setMessage('Alamat tersimpan dihapus. Kembali menggunakan alamat default.');
      return;
    }

    if (!saveBrainGatewayUrl(inputUrl)) {
      setMessage('Masukkan alamat HTTPS utama yang valid (misal https://brain.example.com).');
      return;
    }

    const eff = getEffectiveGatewayUrl();
    setEffective(eff);
    setInputUrl(eff.source === 'localStorage' ? eff.url : '');
    setMessage('Alamat Brain Gateway berhasil disimpan di perangkat ini.');
  };

  const handleClearStored = () => {
    clearStoredBrainGatewayUrl();
    const eff = getEffectiveGatewayUrl();
    setEffective(eff);
    setInputUrl('');
    setMessage('Alamat tersimpan di perangkat telah dihapus.');
  };

  const handlePurgeCache = async () => {
    setIsPurging(true);
    await purgePetalifeShellCacheAndReload();
  };

  const getSourceBadge = () => {
    switch (effective.source) {
      case 'localStorage':
        return <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFEFE8] text-[#BA5218] border border-[#FED7C5]">Override Lokal</span>;
      case 'environment':
        return <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EDE8FA] text-[#483696] border border-[#C8BDEB]">Environment (.env)</span>;
      case 'default':
        return <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAF6EE] text-[#1E6B3B] border-[#CCEBD6]">Default Deployment</span>;
      default:
        return <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F3EDE2] text-[#5A5A6E] border border-[#E2D8C9]">Belum Diatur</span>;
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 select-none">
      {/* 1. Header */}
      <div className="px-1">
        <h1 className="text-xl sm:text-2xl font-black text-[#2E2E3A] tracking-tight">Pengaturan Mochi</h1>
        <p className="mt-0.5 text-xs text-[#5A5A6E]">Kelola koneksi Brain Gateway Asisten Heru dan keandalan PWA.</p>
      </div>

      {/* 2. Live Connection Status Card */}
      <section className="rounded-3xl border border-[#EAE3D5] bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#BA5218]" />
            <h2 className="text-sm font-extrabold text-[#2E2E3A]">Status Brain Gateway</h2>
          </div>
          <button
            type="button"
            onClick={runConnectionTest}
            disabled={isTesting}
            className="flex items-center gap-1 text-xs font-bold text-[#BA5218] hover:text-[#9E410E] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Menguji...' : 'Tes Koneksi'}</span>
          </button>
        </div>

        {/* Diagnostic Status Pill */}
        <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EFE8DD] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#5A5A6E] font-medium">Koneksi Server:</span>
            {diagnostic?.reachable ? (
              <span className="flex items-center gap-1 font-black text-[#1E6B3B]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Terhubung ({diagnostic.latencyMs} ms)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 font-black text-[#DC2626]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{diagnostic?.statusText || 'Terputus / Belum Diuji'}</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#5A5A6E] font-medium">Status AI Gateway:</span>
            <span className="font-bold text-[#2E2E3A]">
              {diagnostic?.reachable
                ? diagnostic.hasLLM
                  ? 'Gateway terhubung · AI siap'
                  : 'Gateway terhubung · AI belum dikonfigurasi'
                : 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#5A5A6E] font-medium">Autentikasi Sesi:</span>
            {diagnostic?.authenticated ? (
              <span className="flex items-center gap-1 font-bold text-[#1E6B3B]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sesi Telegram Aktif</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold text-[#BA5218]">
                PWA Mandiri (AI Terbatas)
              </span>
            )}
          </div>

          {lastSynthesis && (
            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#EAE3D5]/60">
              <span className="text-[#5A5A6E] font-medium">Sintesis Terakhir:</span>
              <span className="font-semibold text-[#2E2E3A] truncate max-w-[170px]" title={lastSynthesis.title}>
                {lastSynthesis.title}
              </span>
            </div>
          )}

          {diagnostic?.errorMessage && (
            <p className="mt-1 text-[11px] text-[#DC2626] leading-tight font-medium bg-[#FFF5F2] p-2 rounded-xl border border-[#FED7C5]/60">
              {diagnostic.errorMessage}
            </p>
          )}
        </div>

        {/* Effective URL Info */}
        <div className="text-xs space-y-1 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5A5A6E]">URL Efektif:</span>
            {getSourceBadge()}
          </div>
          <p className="text-[11px] font-mono font-medium text-[#2E2E3A] break-all bg-[#FAF7F2] px-2.5 py-1.5 rounded-xl border border-[#EFE8DD]">
            {effective.url || '(Belum terhubung)'}
          </p>
        </div>
      </section>

      {/* 3. URL Configuration Form */}
      <section className="rounded-3xl border border-[#EAE3D5] bg-white p-4 shadow-xs space-y-3">
        <div>
          <h2 className="text-sm font-extrabold text-[#2E2E3A]">Konfigurasi Hostname Gateway</h2>
          <p className="mt-0.5 text-xs text-[#5A5A6E]">
            Masukkan alamat Cloudflare Tunnel atau reverse proxy permanen Anda.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            value={inputUrl}
            onChange={e => {
              setInputUrl(e.target.value);
              setMessage('');
            }}
            placeholder={DEFAULT_BRAIN_GATEWAY_URL || 'https://brain.domain-anda.com'}
            className="w-full min-h-11 rounded-2xl border border-[#BFAE9B] bg-[#FAF7F2] px-3.5 text-xs font-medium text-[#2E2E3A] focus:outline-none focus:ring-2 focus:ring-[#BA5218]"
          />

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 min-h-10 rounded-xl bg-[#BA5218] px-4 text-xs font-bold text-white hover:bg-[#9E410E] active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              Simpan Alamat
            </button>

            {effective.source === 'localStorage' && (
              <button
                type="button"
                onClick={handleClearStored}
                className="flex items-center gap-1 min-h-10 rounded-xl border border-[#DECDB5] bg-white px-3 text-xs font-bold text-[#5A5A6E] hover:text-[#DC2626] hover:bg-[#FFF5F2] active:scale-95 transition-all cursor-pointer"
                title="Hapus alamat tersimpan dan kembali ke default deployment"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {message && (
            <p role="status" className="text-xs font-medium text-[#BA5218] min-h-4">
              {message}
            </p>
          )}
        </form>
      </section>

      {/* 4. Safe PWA Cache Purge Card */}
      <section className="rounded-3xl border border-[#EAE3D5] bg-[#FAF7F2] p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#2E2E3A]">Pemeliharaan Aplikasi PWA</h2>
          <span className="text-[10px] font-bold text-[#1E6B3B] bg-[#EAF6EE] px-2 py-0.5 rounded-full border border-[#CCEBD6]">
            Vault Aman
          </span>
        </div>
        <p className="text-[11px] text-[#5A5A6E] leading-relaxed">
          Gunakan tombol di bawah jika aplikasi terasa belum memuat pembaruan terbaru. Hanya membersihkan cache shell tampilan; catatan Vault dan data Mochi Anda tetap aman 100% (IndexedDB tidak disentuh).
        </p>
        <button
          type="button"
          onClick={handlePurgeCache}
          disabled={isPurging}
          className="w-full min-h-10 rounded-xl border border-[#DECDB5] bg-white text-xs font-bold text-[#3E3E4E] hover:bg-[#FAF7EE] active:scale-95 transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          {isPurging ? 'Menyegarkan Cache...' : 'Perbaiki Cache Aplikasi & Muat Ulang'}
        </button>
      </section>
    </div>
  );
}
