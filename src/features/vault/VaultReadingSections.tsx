import type { FC } from 'react';
import type { NoteViewSection } from '../../lib/utils/noteView';

export const VaultReadingSections: FC<{ sections: NoteViewSection[] }> = ({ sections }) => {
  if (sections.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E8DFCF] bg-white p-5 text-sm leading-relaxed text-[#655A50]">
        Belum ada catatan. Ketuk tombol edit untuk menulis hal yang ingin kamu ingat.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E8DFCF] bg-[#FFFEFB] px-5 shadow-[0_3px_10px_#7052390C] sm:px-6">
      {sections.map((section, index) => (
        <section key={`${section.kind}-${index}`} className="border-b border-[#EEE9E1] py-5 last:border-0">
          <h2 className="mb-3 flex items-center gap-3 font-display text-[17px] font-bold leading-snug text-[#604735]">
            <span className="h-5 w-1 rounded-full bg-[#C46B3C] shrink-0" aria-hidden="true" />
            <span>{section.title}</span>
          </h2>
          <div className="pl-4 text-[15px] leading-[1.8] text-[#4E4A49] sm:text-base">
            {section.lines.every(line => line.bullet) ? (
              <ul className="list-disc space-y-3.5 marker:text-[#C46B3C]">
                {section.lines.map((line, lineIndex) => <li key={lineIndex} className="pl-0.5">{line.text}</li>)}
              </ul>
            ) : (
              <div className="space-y-3.5">
                {section.lines.map((line, lineIndex) => (
                  <p key={lineIndex} className={line.bullet ? 'relative pl-3 before:absolute before:left-0 before:text-[#C46B3C] before:content-["•"]' : ''}>
                    {line.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
};
