import { useState, type FormEvent } from 'react';
import { getBrainGatewayUrl, saveBrainGatewayUrl } from '../../lib/services/brainGatewaySettings';

export function SettingsPage() {
  const [url, setUrl] = useState(() => getBrainGatewayUrl());
  const [message, setMessage] = useState('');

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    if (!saveBrainGatewayUrl(url)) {
      setMessage('Masukkan alamat HTTPS utama, misalnya https://brain.example.com, tanpa path atau token.');
      return;
    }
    setUrl(getBrainGatewayUrl());
    setMessage(url.trim() ? 'Alamat Brain Gateway tersimpan di perangkat ini.' : 'Alamat Brain Gateway dihapus.');
  };

  return (
    <section className="max-w-md mx-auto rounded-[28px] border border-[#EAE3D5] bg-[#FAF7F2] p-5 shadow-sm space-y-4">
      <div>
        <h1 className="text-xl font-black text-[#2E2E3A]">Pengaturan Mochi</h1>
        <p className="mt-1 text-sm text-[#4E4E5E]">Hubungkan Petalife ke Asisten Heru lewat HTTPS.</p>
      </div>
      <form onSubmit={handleSave} className="space-y-3">
        <label htmlFor="brain-gateway-url" className="block text-sm font-bold text-[#2E2E3A]">Brain Gateway URL</label>
        <input
          id="brain-gateway-url"
          type="url"
          inputMode="url"
          autoComplete="url"
          value={url}
          onChange={event => { setUrl(event.target.value); setMessage(''); }}
          placeholder="https://brain.example.com"
          className="w-full min-h-11 rounded-xl border border-[#BFAE9B] bg-white px-3 text-sm text-[#2E2E3A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]"
        />
        <p className="text-xs leading-relaxed text-[#4E4E5E]">Isi alamat utama tunnel saja. URL ini disimpan lokal, tanpa token. Sintesis server memerlukan sesi Mini App Telegram yang valid.</p>
        <button type="submit" className="min-h-11 rounded-xl bg-[#BA5218] px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]">Simpan pengaturan</button>
        <p role="status" aria-live="polite" className="min-h-5 text-sm font-medium text-[#3E3E4E]">{message}</p>
      </form>
    </section>
  );
}
