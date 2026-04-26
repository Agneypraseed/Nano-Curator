import React from 'react';
import { ArrowRight, Briefcase, Clock3, History, Leaf, Trash2 } from 'lucide-react';
import Button from '../Button';
import { SessionRecord } from '../../types';

interface HomePageProps {
  sessions: SessionRecord[];
  onStart: () => void;
  onRestore: (session: SessionRecord) => void;
  onDelete: (sessionId: string) => void;
}

const EXAMPLES = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80',
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=80',
];

const EXAMPLE_LABELS = ['Urban Chic', 'Summer Vibes', 'Business Modern'];

export const HomePage: React.FC<HomePageProps> = ({ sessions, onStart, onRestore, onDelete }) => {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 pb-20 sm:px-6 lg:px-8">
      <section className="flex min-h-[80vh] flex-col items-center justify-center gap-16 pt-8 text-center">
        <div className="space-y-6 animate-fade-in">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 md:text-7xl">
            Reinvent Your <span className="text-indigo-600">Style</span>
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-slate-500">
            Your personal AI stylist. Upload your photo, choose your vibe, and get custom outfits and haircut suggestions instantly.
          </p>
          <div className="flex justify-center">
            <Button onClick={onStart} className="px-10 py-4 text-lg shadow-indigo-200">
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
          {EXAMPLES.map((src, index) => (
            <div
              key={src}
              className={`transform border border-slate-100 bg-white p-4 pb-12 shadow-2xl transition-transform duration-300 hover:scale-105 ${
                index === 0 ? '-rotate-3' : index === 1 ? 'translate-y-8 rotate-2' : '-rotate-6'
              }`}
            >
              <div className="aspect-[3/4] overflow-hidden bg-slate-100">
                <img src={src} alt={EXAMPLE_LABELS[index]} className="h-full w-full object-cover" />
              </div>
              <div className="mt-4 text-center text-slate-500">
                {EXAMPLE_LABELS[index]}
              </div>
            </div>
          ))}
        </div>

        <div className="grid w-full grid-cols-1 gap-8 text-left md:grid-cols-2">
          <div className="flex flex-col items-start gap-4 rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-xl transition-all hover:shadow-2xl md:p-10">
            <div className="mb-2 rounded-2xl bg-slate-900 p-3 text-white">
              <Briefcase className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Personal Brand Consultant</h2>
            <p className="leading-relaxed text-slate-500">
              Analyze your professional context, industry trends, and career goals. We recommend complete style transformations with detailed reasoning to help you command the room and elevate your professional identity.
            </p>
          </div>

          <div className="flex flex-col items-start gap-4 rounded-[2.5rem] border border-emerald-100 bg-emerald-50 p-8 shadow-xl transition-all hover:shadow-2xl md:p-10">
            <div className="mb-2 rounded-2xl bg-emerald-600 p-3 text-white">
              <Leaf className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-900">Sustainable Fashion Advisor</h2>
            <p className="leading-relaxed text-emerald-800">
              Build smarter outfits around your real-life needs. The app now helps turn your brief into more reusable, lower-regret style decisions instead of one-off inspiration.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-slate-500" />
          <h2 className="text-xl font-semibold text-slate-900">Recent sessions</h2>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Your recent sessions will appear here once you generate a style collection.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {sessions.map((session) => {
              const previewLook = session.analysis.styles[0];
              const previewImage = previewLook ? session.styleImages[previewLook.id] : '';
              return (
                <article
                  key={session.id}
                  className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[160px_1fr]"
                >
                  <div className="overflow-hidden rounded-3xl bg-slate-100">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt={previewLook?.title ?? 'Saved session'}
                        className="aspect-[3/4] h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center text-sm text-slate-400">No preview</div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-semibold text-slate-900">{session.analysis.summary.headline}</h3>
                          <p className="text-sm text-slate-500">{session.wizardData.goals || session.wizardData.occasion}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDelete(session.id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete saved session"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {new Date(session.createdAt).toLocaleString()}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">{session.wizardData.budget}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">{session.wizardData.dressCode}</span>
                      </div>

                      <p className="line-clamp-3 text-sm leading-6 text-slate-600">{session.analysis.summary.bestLookReason}</p>
                    </div>

                    <Button variant="outline" onClick={() => onRestore(session)} className="self-start">
                      Reopen session
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
