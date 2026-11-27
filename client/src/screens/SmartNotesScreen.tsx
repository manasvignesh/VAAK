import { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  Download,
  Edit3,
  RefreshCw,
} from 'lucide-react';
import type { ClassroomSession, NoteItem, StudyNotes } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface SmartNotesScreenProps {
  session: ClassroomSession | null;
  isGenerating: boolean;
  generationError: string | null;
  onRetryGenerate: () => void;
  onUpdateNotes: (notes: StudyNotes) => void;
  onJumpToSegment: (segmentId: string) => void;
}

function formatTimestamp(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function notesToMarkdown(session: ClassroomSession, notes: StudyNotes): string {
  const lines: string[] = [
    `# ${session.title} — Study Notes (VAAK)`,
    `Generated: ${new Date(notes.generatedAtIso).toLocaleString()}`,
    notes.isDemo
      ? '> Note: Generated from Interactive Demo Mode'
      : notes.isLocalFallback
        ? '> Note: Basic study notes generated locally from transcript'
        : '> Source: Live Classroom Transcript',
    '',
  ];

  if (notes.topicHeadings.length > 0) {
    lines.push('## Topic Headings', ...notes.topicHeadings.map((h) => `- ${h}`), '');
  }

  const addSection = (heading: string, items: NoteItem[]) => {
    if (items.length === 0) return;
    lines.push(`## ${heading}`);
    for (const item of items) {
      const refs = item.references
        .map((r) => `#${r.segmentId} @ ${formatTimestamp(r.timestampMs)}`)
        .join(', ');
      lines.push(
        `### ${item.title}${item.unverified ? ' [Unverified]' : ''}`,
        item.content,
        refs ? `*Evidence:* ${refs}` : '',
        ''
      );
    }
  };

  addSection('Lesson Summary', notes.lessonSummary);
  addSection('Key Concepts', notes.keyConcepts);
  addSection('Important Definitions', notes.importantDefinitions);
  addSection('Highlighted Explanations', notes.highlightedExplanations);
  addSection('Bookmarked Moments', notes.bookmarkedMoments);
  addSection('Unclear or Unverified Information', notes.unclearOrUnverified);

  return lines.join('\n');
}

export function SmartNotesScreen({
  session,
  isGenerating,
  generationError,
  onRetryGenerate,
  onUpdateNotes,
  onJumpToSegment,
}: SmartNotesScreenProps) {
  const [copied, setCopied] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <div className="nb-card-lg bg-[var(--mv-surface)] p-8">
          <BookOpen className="mx-auto h-10 w-10" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold">No Study Notes Selected</h1>
          <p className="mt-2 text-sm font-medium text-[var(--mv-text-muted)]">
            Complete a live or demo classroom session, or open a saved class from My Classes to
            view its evidence-linked study notes.
          </p>
        </div>
      </div>
    );
  }

  const notes = session.notes;

  const handleCopy = async () => {
    if (!notes) return;
    await navigator.clipboard.writeText(notesToMarkdown(session, notes));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!notes) return;
    const md = notesToMarkdown(session, notes);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveItemEdit = (
    sectionKey: keyof Pick<
      StudyNotes,
      | 'keyConcepts'
      | 'importantDefinitions'
      | 'lessonSummary'
      | 'highlightedExplanations'
      | 'bookmarkedMoments'
      | 'unclearOrUnverified'
    >,
    itemId: string
  ) => {
    if (!notes || !editDraft.trim()) return;
    const updated: StudyNotes = {
      ...notes,
      [sectionKey]: notes[sectionKey].map((item) =>
        item.id === itemId ? { ...item, content: editDraft.trim() } : item
      ),
    };
    onUpdateNotes(updated);
    setEditingItemId(null);
  };

  const renderSection = (
    title: string,
    sectionKey: keyof Pick<
      StudyNotes,
      | 'keyConcepts'
      | 'importantDefinitions'
      | 'lessonSummary'
      | 'highlightedExplanations'
      | 'bookmarkedMoments'
      | 'unclearOrUnverified'
    >,
    items: NoteItem[],
    accentBg = 'bg-[var(--mv-surface)]'
  ) => {
    if (items.length === 0) return null;
    return (
      <section className={`nb-card p-6 ${accentBg}`}>
        <h2 className="border-b-[2.5px] border-[var(--mv-border)] pb-2 text-xl font-bold uppercase tracking-wide">
          {title}
        </h2>
        <div className="mt-4 space-y-4">
          {items.map((item) => {
            const isEditing = editingItemId === item.id;
            return (
              <article
                key={item.id}
                className={`rounded-xl border-2 border-[var(--mv-border)] p-4 ${
                  item.unverified ? 'bg-[var(--mv-amber-bg)]' : 'bg-[var(--mv-surface)]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold">{item.title}</h3>
                    {item.unverified && (
                      <span className="nb-pill inline-flex items-center gap-1 bg-[var(--mv-amber)] px-2.5 py-0.5 text-xs font-bold text-[#151515]">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        Unverified / Check Audio
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItemId(item.id);
                      setEditDraft(item.content);
                    }}
                    className="nb-btn inline-flex min-h-8 items-center gap-1 bg-[var(--mv-bg)] px-2.5 py-1 text-xs font-bold"
                  >
                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Edit</span>
                  </button>
                </div>

                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      rows={3}
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      className="w-full rounded-lg border-2 border-[var(--mv-border)] bg-[var(--mv-surface)] p-2.5 text-sm font-medium"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveItemEdit(sectionKey, item.id)}
                        className="nb-btn bg-[var(--mv-lime)] px-3 py-1.5 text-xs font-bold text-[#151515]"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingItemId(null)}
                        className="nb-btn bg-[var(--mv-surface)] px-3 py-1.5 text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-medium leading-relaxed">{item.content}</p>
                )}

                {item.references.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--mv-text-muted)]">
                      Source:
                    </span>
                    {item.references.map((ref) => (
                      <button
                        key={ref.segmentId}
                        type="button"
                        onClick={() => onJumpToSegment(ref.segmentId)}
                        title={ref.excerpt}
                        className="nb-btn inline-flex min-h-8 items-center gap-1 bg-[var(--mv-lime)] px-2.5 py-1 font-mono text-xs font-bold text-[#151515]"
                      >
                        <span>
                          #{ref.segmentId} @ {formatTimestamp(ref.timestampMs)}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-10">
      <header className="nb-card-lg flex flex-wrap items-start justify-between gap-4 bg-[var(--mv-surface)] p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{session.title}</h1>
            {notes && (
              <StatusBadge
                tone={notes.isDemo ? 'demo' : notes.isLocalFallback ? 'warning' : 'success'}
                label={
                  notes.isDemo
                    ? 'Demo Study Notes'
                    : notes.isLocalFallback
                      ? 'Basic Local Notes'
                      : 'Evidence-Linked AI Notes'
                }
              />
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium text-[var(--mv-text-muted)]">
            {new Date(session.createdAtIso).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}{' '}
            • Print-style study document with verified transcript references.
          </p>
        </div>

        {notes && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="nb-btn inline-flex min-h-10 items-center gap-1.5 bg-[var(--mv-surface)] px-3.5 py-2 text-sm font-bold"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="nb-btn inline-flex min-h-10 items-center gap-1.5 bg-[var(--mv-lime)] px-4 py-2 text-sm font-bold text-[#151515]"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Download .md</span>
            </button>
          </div>
        )}
      </header>

      {isGenerating && (
        <div role="status" className="nb-card bg-[var(--mv-lavender)] p-8 text-center text-[#151515]">
          <p className="text-base font-bold">
            Generating evidence-linked study notes and validating transcript references...
          </p>
        </div>
      )}

      {notes?.isLocalFallback && (
        <div
          role="status"
          className="nb-card flex flex-wrap items-center justify-between gap-3 bg-[var(--mv-amber)] p-4 text-sm font-bold text-[#151515]"
        >
          <div>
            <p>
              {notes.notice ||
                'Basic study notes — generated locally from your classroom transcript. AI summarization is currently unavailable.'}
            </p>
            {generationError && <p className="mt-1 text-xs font-medium">{generationError}</p>}
          </div>
          <button
            type="button"
            onClick={onRetryGenerate}
            className="nb-btn inline-flex min-h-10 items-center gap-1.5 bg-[var(--mv-surface)] px-4 py-2 font-bold text-[var(--mv-text)]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Retry AI-Enhanced Notes</span>
          </button>
        </div>
      )}

      {generationError && !notes?.isLocalFallback && (
        <div role="alert" className="nb-card bg-[var(--mv-danger)] p-5 text-sm font-bold text-[#151515]">
          <p>Could Not Generate Study Notes</p>
          <p className="mt-1 font-medium">{generationError}</p>
          <button
            type="button"
            onClick={onRetryGenerate}
            className="nb-btn mt-3 inline-flex min-h-10 items-center gap-1.5 bg-white px-4 py-2 font-bold text-[#151515]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Retry Note Generation</span>
          </button>
        </div>
      )}

      {notes && (
        <div className="space-y-6">
          {notes.topicHeadings.length > 0 && (
            <section className="nb-card bg-[var(--mv-surface)] p-6">
              <h2 className="border-b-[2.5px] border-[var(--mv-border)] pb-2 text-xl font-bold uppercase tracking-wide">
                Topic Outline
              </h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm font-semibold">
                {notes.topicHeadings.map((h, idx) => (
                  <li key={idx}>{h}</li>
                ))}
              </ul>
            </section>
          )}

          {renderSection('Lesson Summary', 'lessonSummary', notes.lessonSummary)}
          {renderSection('Key Concepts', 'keyConcepts', notes.keyConcepts)}
          {renderSection('Important Definitions', 'importantDefinitions', notes.importantDefinitions)}
          {renderSection(
            'Highlighted Explanations',
            'highlightedExplanations',
            notes.highlightedExplanations
          )}
          {renderSection('Bookmarked Moments', 'bookmarkedMoments', notes.bookmarkedMoments)}
          {renderSection(
            'Unverified or Unclear Information',
            'unclearOrUnverified',
            notes.unclearOrUnverified
          )}
        </div>
      )}
    </div>
  );
}
