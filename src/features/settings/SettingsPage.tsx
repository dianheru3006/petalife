import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
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
import {
  exportPetalifeBackup,
  downloadBackupFile,
  parseBackupFile,
  restorePetalifeBackup,
  resetPetalifeData,
  type ParsedBackup,
} from '../../lib/db/backup';
import {
  applyReducedMotion,
  loadReducedMotion,
  saveReducedMotion,
} from '../../lib/preferences/appPreferences';
import {
  Activity,
  RefreshCw,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Download,
  Upload,
  Moon,
  Sun,
  Waves,
} from 'lucide-react';

export interface SettingsPageProps {
  nightMode?: boolean;
  onToggleNightMode?: () => void;
  /** Rebuilds App state after an import or a reset replaced the local data. */
  onDataRestored?: () => void | Promise<void>;
}

export function SettingsPage({
  nightMode = false,
  onToggleNightMode,
  onDataRestored,
}: SettingsPageProps) {
  const [effective, setEffective] = useState(() => getEffectiveGatewayUrl());
  const [inputUrl, setInputUrl] = useState(() => effective.source === 'localStorage' ? effective.url : '');
  const [message, setMessage] = useState('');
  const [diagnostic, setDiagnostic] = useState<GatewayDiagnostic | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => loadReducedMotion());
  const [isBusy, setIsBusy] = useState(false);
  const [dataMessage, setDataMessage] = useState('');
  const [importPreview, setImportPreview] = useState<ParsedBackup | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState<'none' | 'pet' | 'all'>('none');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // AUDIT-FIX (P2): every diagnostic request gets a token. Without it, saving a
  // new URL while the previous 3s probe was in flight let the stale result
  // overwrite the fresh one — a green "Terhubung" for a server you just replaced.
  const testTokenRef = useRef(0);

  const lastSynthesis = getLastSuccessfulSynthesis();

  const runConnectionTest = async () => {
    const token = ++testTokenRef.current;
    setIsTesting(true);
    try {
      const diag = await testGatewayConnection(effective.url || undefined, 3000);
      if (testTokenRef.current === token) setDiagnostic(diag);
    } catch {
      if (testTokenRef.current === token) {
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
      }
    } finally {
      if (testTokenRef.current === token) setIsTesting(false);
    }
  };

  // Test connection on mount or when effective URL changes
  useEffect(() => {
    void runConnectionTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effective.url]);

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

  const handleExportBackup = async () => {
    if (isBusy) return;
    setIsBusy(true);
    setDataMessage('');
    try {
      const backup = await exportPetalifeBackup();
      const downloaded = downloadBackupFile(backup);
      setDataMessage(downloaded
        ? `Cadangan dibuat: ${backup.links.length} materi, ${backup.notes.length} catatan, dan status Mochi.`
        : 'Browser ini tidak mendukung unduhan otomatis. Buka lewat Chrome/Safari.');
    } catch {
      setDataMessage('Gagal membuat cadangan. Periksa ruang penyimpanan perangkat.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleFilePicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow picking the same file twice in a row.
    event.target.value = '';
    if (!file) return;

    setDataMessage('');
    setImportPreview(null);
    setPendingFileName(file.name);

    if (file.size > 8_000_000) {
      setDataMessage('File cadangan terlalu besar (maks 8 MB).');
      setPendingFileName(null);
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseBackupFile(text);
      if (!parsed.ok) {
        setDataMessage(parsed.error);
        setPendingFileName(null);
        return;
      }
      setImportPreview(parsed.parsed);
    } catch {
      setDataMessage('File tidak dapat dibaca.');
      setPendingFileName(null);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview || isBusy) return;
    setIsBusy(true);
    try {
      const result = await restorePetalifeBackup(importPreview.backup);
      await onDataRestored?.();
      const skippedTotal = Object.values(result.skipped).reduce((sum, value) => sum + value, 0);
      setDataMessage(
        `Berhasil memulihkan ${result.links} materi dan ${result.notes} catatan`
        + `${result.petRestored ? ' + status Mochi' : ''}`
        + `${skippedTotal > 0 ? ` (${skippedTotal} entri rusak dilewati)` : ''}.`,
      );
      setImportPreview(null);
      setPendingFileName(null);
    } catch (err) {
      setDataMessage(err instanceof Error ? err.message : 'Impor gagal. Data lama tetap aman.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleReset = async (mode: 'pet' | 'all') => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await resetPetalifeData({ includeDatabase: mode === 'all' });
      await onDataRestored?.();
      setDataMessage(mode === 'all'
        ? 'Seluruh data lokal (Pustaka, catatan, reward, dan Mochi) telah dihapus.'
        : 'Status Mochi kembali ke awal. Pustaka dan catatan tetap aman.');
      setResetMode('none');
      setImportPreview(null);
    } catch {
      setDataMessage('Reset gagal. Tidak ada data yang dihapus.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleToggleReducedMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    const persisted = saveReducedMotion(next);
    applyReducedMotion(next);
    if (!persisted) setDataMessage('Preferensi gerakan tidak dapat disimpan di perangkat ini.');
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
        <p className="mt-0.5 text-xs text-[#5A5A6E]">Kelola koneksi Brain Gateway, data lokal, dan tampilan.</p>
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
            onClick={() => void runConnectionTest()}
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
            {isTesting ? (
              <span className="flex items-center gap-1 font-black text-[#8C6D23]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Memeriksa…</span>
              </span>
            ) : diagnostic?.reachable ? (
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

      {/* 4. Appearance & Performance */}
      <section className="rounded-3xl border border-[#EAE3D5] bg-white p-4 shadow-xs space-y-3">
        <h2 className="text-sm font-extrabold text-[#2E2E3A]">Tampilan & Performa</h2>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#2E2E3A] flex items-center gap-1.5">
              {nightMode ? <Moon className="w-3.5 h-3.5 text-[#483696]" /> : <Sun className="w-3.5 h-3.5 text-[#9E410E]" />}
              Mode Malam Mochi
            </p>
            <p className="mt-0.5 text-[11px] text-[#5A5A6E] leading-snug">
              Meredupkan diorama dan menidurkan Mochi. Energi pulih lebih cepat.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={nightMode}
            aria-label="Mode malam Mochi"
            onClick={onToggleNightMode}
            disabled={!onToggleNightMode}
            className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors duration-300 disabled:opacity-40 cursor-pointer ${
              nightMode ? 'bg-[#483696] border-[#3B2982]' : 'bg-[#E5DDD0] border-[#D5CBBA]'
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all duration-300 ${
                nightMode ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#EFE8DD] pt-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#2E2E3A] flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-[#BA5218]" />
              Kurangi Animasi
            </p>
            <p className="mt-0.5 text-[11px] text-[#5A5A6E] leading-snug">
              Matikan animasi sprite & TV yang berjalan terus. Hemat baterai di HP kelas menengah.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={reducedMotion}
            aria-label="Kurangi animasi"
            onClick={handleToggleReducedMotion}
            className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors duration-300 cursor-pointer ${
              reducedMotion ? 'bg-[#BA5218] border-[#9E410E]' : 'bg-[#E5DDD0] border-[#D5CBBA]'
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all duration-300 ${
                reducedMotion ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
      </section>

      {/* 5. Data Management: export, import, reset */}
      <section className="rounded-3xl border border-[#EAE3D5] bg-white p-4 shadow-xs space-y-3">
        <div>
          <h2 className="text-sm font-extrabold text-[#2E2E3A]">Data & Cadangan</h2>
          <p className="mt-0.5 text-[11px] text-[#5A5A6E] leading-snug">
            Semua data tinggal di perangkat ini (IndexedDB + localStorage). Buat cadangan
            sebelum mengganti perangkat atau membersihkan data browser.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleExportBackup()}
            disabled={isBusy}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#DECDB5] bg-[#FAF7F2] text-xs font-bold text-[#2E2E3A] hover:bg-[#F2ECE0] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-[#BA5218]" />
            <span>{isBusy ? 'Memproses…' : 'Ekspor Cadangan (JSON)'}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#DECDB5] bg-white text-xs font-bold text-[#2E2E3A] hover:bg-[#FAF7F2] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-[#483696]" />
            <span>Impor Cadangan</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Pilih file cadangan Petalife"
            onChange={event => void handleFilePicked(event)}
          />
        </div>

        {/* Two-step import: never wipe the Vault on a single tap */}
        {importPreview && (
          <div className="rounded-2xl border border-[#C8BDEB] bg-[#F7F4FF] p-3 space-y-2" role="alertdialog" aria-label="Konfirmasi impor cadangan">
            <p className="text-xs font-black text-[#3B2982]">Timpa data lokal dengan cadangan ini?</p>
            <p className="text-[11px] text-[#4E4E5E] leading-snug">
              {pendingFileName ? `${pendingFileName} · ` : ''}
              {importPreview.backup.links.length} materi, {importPreview.backup.notes.length} catatan,{' '}
              {importPreview.backup.rewardLedger.length} klaim reward
              {importPreview.backup.pet ? ', status Mochi' : ''}.
              Data saat ini akan diganti.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setImportPreview(null); setPendingFileName(null); }}
                disabled={isBusy}
                className="min-h-10 flex-1 rounded-xl border border-[#DDCDBF] bg-white text-xs font-semibold text-[#493D32] cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmImport()}
                disabled={isBusy}
                className="min-h-10 flex-1 rounded-xl bg-[#483696] text-xs font-bold text-white cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isBusy ? 'Memulihkan…' : 'Timpa Data'}
              </button>
            </div>
          </div>
        )}

        {dataMessage && (
          <p role="status" className="rounded-xl border border-[#E2D8C9] bg-[#FAF7F2] px-3 py-2 text-[11px] font-semibold text-[#3E3E4E] leading-snug">
            {dataMessage}
          </p>
        )}

        <div className="border-t border-[#EFE8DD] pt-3 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8B3D16]">Zona Berbahaya</p>

          {resetMode === 'none' ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setResetMode('pet')}
                className="min-h-10 rounded-xl border border-[#FED7C5] bg-[#FFF7F3] px-3 text-[11px] font-bold text-[#923C23] cursor-pointer active:scale-95"
              >
                Reset Status Mochi
              </button>
              <button
                type="button"
                onClick={() => setResetMode('all')}
                className="min-h-10 rounded-xl border border-[#F5B7B1] bg-[#FDEDEC] px-3 text-[11px] font-bold text-[#78281F] cursor-pointer active:scale-95"
              >
                Reset Total
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#F5B7B1] bg-[#FDF3F2] p-3 space-y-2" role="alertdialog" aria-label="Konfirmasi reset data">
              <p className="text-xs font-black text-[#78281F]">
                {resetMode === 'all'
                  ? 'Hapus SEMUA materi, catatan, reward, dan status Mochi?'
                  : 'Kembalikan Mochi ke level 1 tanpa menghapus Pustaka?'}
              </p>
              <p className="text-[11px] text-[#7A4A44] leading-snug">
                {resetMode === 'all'
                  ? 'Tindakan ini permanen. Ekspor cadangan terlebih dahulu jika masih ragu.'
                  : 'Hanya data pet (level, XP, kenyang, energi) yang dihapus.'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResetMode('none')}
                  disabled={isBusy}
                  className="min-h-10 flex-1 rounded-xl border border-[#DDCDBF] bg-white text-xs font-semibold text-[#493D32] cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => void handleReset(resetMode)}
                  disabled={isBusy}
                  className="min-h-10 flex-1 rounded-xl bg-[#A33F27] text-xs font-bold text-white cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isBusy ? 'Menghapus…' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. Safe PWA Cache Purge Card */}
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
