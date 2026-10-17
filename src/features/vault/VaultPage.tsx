import type { FC, FormEvent } from 'react';
import { useState } from 'react';
import type { SavedLink, PlatformType, LinkStatus } from '../../lib/types';
import { detectPlatform, isValidUrl, cn } from '../../lib/utils';
import { normalizeUrl } from '../../lib/utils/urlUtils';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Search, Plus, ExternalLink, Trash2, Bookmark, Pencil, Check } from 'lucide-react';

export interface VaultPageProps {
  links: SavedLink[];
  onAddLink: (link: SavedLink) => Promise<void>;
  onUpdateLink?: (id: string, updates: Partial<SavedLink>) => void;
  onDeleteLink: (id: string) => void;
  onUpdateStatus: (id: string, status: LinkStatus) => void;
  isNightMode?: boolean;
}

export const VaultPage: FC<VaultPageProps> = ({
  links,
  onAddLink,
  onUpdateLink,
  onDeleteLink,
  onUpdateStatus,
  isNightMode = false,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [isAddingOpen, setIsAddingOpen] = useState(false);

  // Card edit mode states
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSummary, setEditSummary] = useState('');

  const categories = ['All', 'Shorts & Reels', 'Tech', 'Cooking', 'Business', 'Design'];

  // Status counts for tabs
  const toReviewCount = links.filter(l => l.status === 'to_review').length;
  const inProgressCount = links.filter(l => l.status === 'in_progress').length;
  const completedCount = links.filter(l => l.status === 'completed').length;

  const handleStartEdit = (link: SavedLink) => {
    setEditingLinkId(link.id);
    setEditTitle(link.title);
    setEditNotes(link.notes || '');
    setEditSummary(link.summary || '');
  };

  const handleSaveEdit = (id: string) => {
    if (onUpdateLink) {
      onUpdateLink(id, {
        title: editTitle.trim() || 'Saved Material',
        notes: editNotes.trim(),
        summary: editSummary.trim(),
      });
      setEditingLinkId(null);
      setSuccessToast('✨ Study material updated successfully!');
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSavingLink) return;
    const trimmedUrl = urlInput.trim();

    if (!trimmedUrl) {
      setUrlError('Please enter a valid link address (e.g. tiktok.com/..., youtube.com/shorts/...)');
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setUrlError('Invalid URL format. Please include a domain name like tiktok.com or youtube.com');
      return;
    }

    const targetNormalized = normalizeUrl(trimmedUrl);
    const isDuplicate = links.some(l => normalizeUrl(l.url) === targetNormalized);

    if (isDuplicate) {
      setUrlError('This link is already saved in your Vault! Review it or take notes instead.');
      return;
    }

    setUrlError(null);
    const { platform, domain } = detectPlatform(trimmedUrl);

    // Auto title if user left it blank
    const title = customTitle.trim() || `Saved ${domain} Video Clip #${links.length + 1}`;
    const now = Date.now();

    const newLink: SavedLink = {
      id: `link-${now}`,
      url: trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`,
      title,
      platform,
      domain,
      tags: [platform === 'youtube' || platform === 'tiktok' || platform === 'instagram' ? 'shorts' : 'article', 'new'],
      status: 'to_review',
      dateAdded: 'Just now',
      createdAt: now,
      updatedAt: now,
      notes: customNotes.trim() || 'Added from quick capture.',
      summary: 'Ready for study and personal reflection.'
    };

    setIsSavingLink(true);
    try {
      await onAddLink(newLink);
      setUrlInput('');
      setCustomTitle('');
      setCustomNotes('');
      setIsAddingOpen(false);
      setSuccessToast(`🎉 Saved to Vault: "${title}"`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch {
      setUrlError('Could not save this link locally. Check storage and try again.');
    } finally {
      setIsSavingLink(false);
    }
  };

  // Filter links by search, category, and learning status
  const filteredLinks = links.filter(link => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      link.title.toLowerCase().includes(q) ||
      link.domain.toLowerCase().includes(q) ||
      (link.notes && link.notes.toLowerCase().includes(q)) ||
      (link.summary && link.summary.toLowerCase().includes(q)) ||
      link.tags.some(t => t.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    // Category filter
    if (selectedCategory === 'Shorts & Reels') {
      if (link.platform !== 'tiktok' && link.platform !== 'youtube' && link.platform !== 'instagram') {
        return false;
      }
    } else if (selectedCategory !== 'All') {
      const matchCat = link.tags.some(t => t.toLowerCase() === selectedCategory.toLowerCase());
      if (!matchCat) return false;
    }

    // Status filter
    if (selectedStatusFilter !== 'all' && link.status !== selectedStatusFilter) {
      return false;
    }

    return true;
  });

  const getPlatformBadge = (platform: PlatformType, domain: string) => {
    switch (platform) {
      case 'youtube':
        return <Badge variant="peach" size="sm">▶️ {domain}</Badge>;
      case 'tiktok':
        return <Badge variant="pink" size="sm">🎵 {domain}</Badge>;
      case 'instagram':
        return <Badge variant="lavender" size="sm">📸 {domain}</Badge>;
      default:
        return <Badge variant="mint" size="sm">🌐 {domain}</Badge>;
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Top Banner & Quick Add Card */}
      <div
        className={cn(
          'rounded-3xl p-4 sm:p-5 shadow-xs border transition-colors duration-700',
          isNightMode
            ? 'bg-[#FAF6EE] border-[#DDD2C2]'
            : 'bg-[#FAF7F2] border-[#ECE6DB]'
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-[#2E2E3A] flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-[#D97736]" />
              <span>Capture & Study Material Vault</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#828292]">
              Save links from YouTube, TikTok, Reels, or blogs to build your visual learning vault.
            </p>
          </div>
          <Button
            onClick={() => setIsAddingOpen(!isAddingOpen)}
            variant={isAddingOpen ? 'outline' : 'peach'}
            size="sm"
            className="self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingOpen ? 'Close Form' : 'Add Link'}</span>
          </Button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div role="status" className="mb-4 p-3 rounded-2xl bg-[#EAF6EE] border border-[#CCEBD6] text-xs font-bold text-[#36955E] flex items-center gap-2 animate-fade-in">
            <span>✅</span>
            <span>{successToast}</span>
          </div>
        )}

        {/* Input Form */}
        {isAddingOpen && (
          <form onSubmit={handleAddSubmit} className="space-y-3 pt-3 border-t border-[#F2ECE1]">
            <div>
              <label className="block text-xs font-bold text-[#4A4A5A] mb-1">
                Link URL *
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={e => {
                  setUrlInput(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                placeholder="e.g. https://www.tiktok.com/@creator/video/123... or youtube.com/shorts/..."
                className={`w-full text-xs sm:text-sm px-4 py-3 rounded-2xl border ${
                  isNightMode ? 'bg-[#F2EBE0]' : 'bg-[#FAF7F2]'
                } text-[#2E2E3A] focus:outline-none focus:ring-2 transition-all ${
                  urlError
                    ? 'border-[#E57399] focus:ring-[#E57399]/30 bg-[#FDF0F4]'
                    : isNightMode
                      ? 'border-[#E2D8C9] focus:ring-[#FED7C5] focus:bg-[#FAF6EE]'
                      : 'border-[#EAE6DF] focus:ring-[#FED7C5] focus:bg-[#FFFDF9]'
                }`}
              />
              {urlError && (
                <p role="alert" className="text-[11px] font-semibold text-[#C44A72] mt-1 pl-1">
                  ⚠️ {urlError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A4A5A] mb-1">
                Custom Title (Optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                placeholder="e.g. 5 Rules for Clean Python Code"
                className={`w-full text-xs sm:text-sm px-4 py-2.5 rounded-2xl border ${
                  isNightMode
                    ? 'border-[#E2D8C9] bg-[#F2EBE0] focus:bg-[#FAF6EE]'
                    : 'border-[#EAE6DF] bg-[#FAF7F2] focus:bg-[#FFFDF9]'
                } text-[#2E2E3A] focus:outline-none focus:ring-2 focus:ring-[#FED7C5] transition-all`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A4A5A] mb-1">
                Initial Takeaway / Note (Feeds into Daily Quiz)
              </label>
              <textarea
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="What is the key lesson or recipe ingredient in this clip?"
                rows={2}
                className={`w-full text-xs sm:text-sm p-3 rounded-2xl border ${
                  isNightMode
                    ? 'border-[#E2D8C9] bg-[#F2EBE0] focus:bg-[#FAF6EE]'
                    : 'border-[#EAE6DF] bg-[#FAF7F2] focus:bg-[#FFFDF9]'
                } text-[#2E2E3A] focus:outline-none focus:ring-2 focus:ring-[#FED7C5] resize-none`}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddingOpen(false);
                  setUrlError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="peach" size="sm" disabled={isSavingLink}>
                <span>{isSavingLink ? 'Saving…' : 'Save to Vault (+10 XP)'}</span>
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Search & Multi-Filter Controls */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#8E8E9E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, notes, platform, or #tag..."
            className={cn(
              'w-full text-xs sm:text-sm pl-10 pr-4 py-3 rounded-2xl border text-[#2E2E3A] placeholder-[#8E8E9E] focus:outline-none focus:ring-2 focus:ring-[#FED7C5] shadow-xs transition-colors duration-700',
              isNightMode
                ? 'bg-[#F2EBE0] border-[#E2D8C9]'
                : 'bg-[#FAF7F2] border-[#ECE6DB]'
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8E8E9E] hover:text-[#2E2E3A] px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Learning Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedStatusFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
              selectedStatusFilter === 'all'
                ? 'bg-[#2E2E3A] text-white border-[#2E2E3A] shadow-xs'
                : isNightMode
                  ? 'bg-[#F2EBE0] text-[#6B6B7E] border-[#E2D8C9] hover:bg-[#EAE2D5]'
                  : 'bg-[#FAF7F2] text-[#6B6B7E] border-[#ECE6DB] hover:bg-[#F3EDE2]'
            }`}
          >
            All Materials ({links.length})
          </button>
          <button
            onClick={() => setSelectedStatusFilter('to_review')}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
              selectedStatusFilter === 'to_review'
                ? 'bg-[#FFEFE8] text-[#D97736] border-[#FED7C5] shadow-xs'
                : isNightMode
                  ? 'bg-[#F2EBE0] text-[#6B6B7E] border-[#E2D8C9] hover:bg-[#EAE2D5]'
                  : 'bg-[#FAF7F2] text-[#6B6B7E] border-[#ECE6DB] hover:bg-[#F3EDE2]'
            }`}
          >
            ⏳ To Review ({toReviewCount})
          </button>
          <button
            onClick={() => setSelectedStatusFilter('in_progress')}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
              selectedStatusFilter === 'in_progress'
                ? 'bg-[#F0EDF9] text-[#7161BF] border-[#DCD6F3] shadow-xs'
                : isNightMode
                  ? 'bg-[#F2EBE0] text-[#6B6B7E] border-[#E2D8C9] hover:bg-[#EAE2D5]'
                  : 'bg-[#FAF7F2] text-[#6B6B7E] border-[#ECE6DB] hover:bg-[#F3EDE2]'
            }`}
          >
            📖 Studying ({inProgressCount})
          </button>
          <button
            onClick={() => setSelectedStatusFilter('completed')}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
              selectedStatusFilter === 'completed'
                ? 'bg-[#EAF6EE] text-[#36955E] border-[#CCEBD6] shadow-xs'
                : isNightMode
                  ? 'bg-[#F2EBE0] text-[#6B6B7E] border-[#E2D8C9] hover:bg-[#EAE2D5]'
                  : 'bg-[#FAF7F2] text-[#6B6B7E] border-[#ECE6DB] hover:bg-[#F3EDE2]'
            }`}
          >
            ✅ Mastered ({completedCount})
          </button>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#FED7C5] text-[#7A3613] border-[#F4A261]/40 font-bold shadow-xs'
                  : isNightMode
                    ? 'bg-[#F2EBE0] text-[#5B5B6D] border-[#E2D8C9] hover:bg-[#EAE2D5]'
                    : 'bg-[#FAF7F2] text-[#5B5B6D] border-[#ECE6DB] hover:bg-[#F3EDE2]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Links Grid */}
      {filteredLinks.length === 0 ? (
        <div
          className={cn(
            'rounded-3xl p-10 border text-center space-y-2 transition-colors duration-700',
            isNightMode
              ? 'bg-[#FAF6EE] border-[#DDD2C2]'
              : 'bg-[#FAF7F2] border-[#ECE6DB]'
          )}
        >
          <div className="text-3xl">🔍</div>
          <h4 className="font-extrabold text-sm text-[#2E2E3A]">No saved materials found</h4>
          <p className="text-xs text-[#828292] max-w-sm mx-auto">
            Try adjusting your search query, change your filter tab, or save a new link above!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {filteredLinks.map(link => {
            const isEditing = editingLinkId === link.id;

            return (
              <div
                key={link.id}
                className={cn(
                  'rounded-3xl p-4 sm:p-5 border shadow-xs hover:shadow-sm transition-colors duration-700 flex flex-col justify-between',
                  isNightMode
                    ? 'bg-[#FAF6EE] border-[#DDD2C2] hover:border-[#DCD6F3]'
                    : 'bg-[#FAF7F2] border-[#ECE6DB] hover:border-[#DCD6F3]'
                )}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2.5">
                    {getPlatformBadge(link.platform, link.domain)}
                    <span className="text-[11px] text-[#8E8E9E]">{link.dateAdded}</span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 mb-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="Material Title"
                        className="w-full text-xs font-bold px-3 py-1.5 rounded-xl border border-[#FED7C5] bg-[#FAF7F2]"
                      />
                      <textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        placeholder="Study notes / key takeaway"
                        rows={2}
                        className="w-full text-xs p-2.5 rounded-xl border border-[#FED7C5] bg-[#FAF7F2] resize-none"
                      />
                      <div className="flex justify-end gap-1.5">
                        <Button onClick={() => setEditingLinkId(null)} variant="ghost" size="sm">
                          Cancel
                        </Button>
                        <Button onClick={() => handleSaveEdit(link.id)} variant="peach" size="sm">
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-extrabold text-sm text-[#2E2E3A] leading-snug mb-2">
                        {link.title}
                      </h4>

                      {(link.summary || link.notes) && (
                        <p className="text-xs text-[#6B6B7E] mb-3 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EFE8DD] leading-relaxed">
                          💡 <b>Takeaway:</b> {link.notes || link.summary}
                        </p>
                      )}
                    </>
                  )}

                  {/* Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-4">
                    {link.tags.map(t => (
                      <span
                        key={t}
                        className="text-[10px] text-[#6B6B7E] bg-[#F7F3E9] px-2 py-0.5 rounded-md border border-[#EAE3D5] font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Status & Actions */}
                <div className="pt-3 border-t border-[#F2ECE1] flex items-center justify-between text-xs">
                  {/* Status Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#828292] font-semibold">Status:</span>
                    <select
                      value={link.status}
                      onChange={e => {
                        const newStatus = e.target.value as LinkStatus;
                        onUpdateStatus(link.id, newStatus);
                        if (newStatus === 'completed') {
                          setSuccessToast(`🎉 "${link.title}" marked as Mastered! (+10 XP to Mochi)`);
                          setTimeout(() => setSuccessToast(null), 3500);
                        }
                      }}
                      className="text-xs font-bold bg-[#FAF7F2] border border-[#EAE6DF] rounded-lg px-2 py-1 text-[#4A4A5A] cursor-pointer focus:outline-none"
                    >
                      <option value="to_review">⏳ To Review</option>
                      <option value="in_progress">📖 Studying</option>
                      <option value="completed">✅ Mastered</option>
                    </select>
                  </div>

                  {/* Action Icons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(link)}
                      className="p-1.5 text-[#8E8E9E] hover:text-[#D97736] hover:bg-[#FFEFE8] rounded-lg transition-colors cursor-pointer"
                      title="Edit Material"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-[#7161BF] hover:bg-[#F0EDF9] rounded-lg transition-colors cursor-pointer"
                      title="Open Source Link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => onDeleteLink(link.id)}
                      className="p-1.5 text-[#C44A72] hover:bg-[#FDF0F4] rounded-lg transition-colors cursor-pointer"
                      title="Delete Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
