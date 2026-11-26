import { ArrowRight, ClipboardList, Shirt, Trash2 } from 'lucide-react';
import Button from '../Button';
import { SessionRecord } from '../../types';

interface HomePageProps {
  sessions: SessionRecord[];
  onStart: () => void;
  onOpenWardrobe: () => void;
  onRestore: (session: SessionRecord) => void;
  onDelete: (sessionId: string) => void;
}

export function HomePage({ sessions, onStart, onOpenWardrobe, onRestore, onDelete }: HomePageProps) {
  const studioLinks = [
    { label: 'Style brief', detail: 'Plan outfits, try-on previews, and hair direction.', Icon: ClipboardList, onClick: onStart },
    { label: 'Wardrobe', detail: 'Add outfit photos and reuse individual pieces.', Icon: Shirt, onClick: onOpenWardrobe },
  ];

  return (
    <div className="studio-shell py-6 sm:py-9 lg:py-[2.375rem]">
      <section className="grid grid-cols-1 items-center gap-7 border-b studio-rule pb-8 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] md:gap-8 lg:gap-10">
        <div className="py-2 lg:pl-5">
          <h1 className="text-[clamp(3.15rem,7.1vw,6.75rem)] font-semibold leading-[0.95] tracking-[-0.055em] text-stone-950">
            {'A style of '}
            <em className="block pr-3 pb-2 text-plum-700">your own.</em>
          </h1>
          <p className="mt-5 max-w-[34rem] text-base leading-[1.47] text-stone-700 lg:mt-8 lg:text-[1.5rem]">
            Build outfits around your occasion, your preferences, and the pieces you already own.
          </p>
          <div className="mt-6 flex flex-col items-stretch gap-x-6 gap-y-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-y-3 lg:mt-11 lg:gap-x-9">
            <Button onClick={onStart} className="min-h-12 lg:min-h-14 lg:gap-4 lg:px-7 lg:text-[1.375rem]">
              Create a style brief <ArrowRight className="size-5 shrink-0 lg:size-6" aria-hidden="true" />
            </Button>
            <button
              type="button"
              onClick={onOpenWardrobe}
              className="min-h-11 text-sm font-semibold text-plum-700 underline decoration-1 underline-offset-[0.45em] transition-colors hover:text-plum-900 lg:text-[1.375rem]"
            >
              Open wardrobe
            </button>
          </div>
        </div>
        <img
          src="/studio/editorial.webp"
          alt="Espresso tailoring and ivory trousers against a lilac studio wall"
          width={1510}
          height={1041}
          fetchPriority="high"
          className="studio-hero-photo aspect-[1.4] bg-[#b99ca5] object-cover object-[76%_50%] sm:aspect-[1.45] sm:w-full sm:rounded-lg"
        />
      </section>

      <section className="mt-6" aria-labelledby="studio-links-title">
        <h2 id="studio-links-title" className="section-title mb-4 text-[1.75rem] lg:text-[2.35rem]">Explore the studio</h2>
        <div className="grid gap-x-6 md:grid-cols-2">
          {studioLinks.map(({ label, detail, Icon, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 border-b studio-rule px-2 py-3 text-left transition-colors first:border-t hover:bg-plum-50 md:border-t lg:gap-8 lg:px-5"
            >
              <Icon className="size-7 text-plum-700 lg:size-10" strokeWidth={1.35} aria-hidden="true" />
              <span className="grid gap-0.5">
                <span className="text-base font-bold text-stone-950 lg:text-[1.375rem]">{label}</span>
                <span className="text-sm text-stone-700 lg:text-[1.125rem]">{detail}</span>
              </span>
              <ArrowRight className="size-5 text-plum-700 transition-transform group-hover:translate-x-1 lg:size-6" strokeWidth={1.55} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 pb-3 lg:mt-9" aria-labelledby="recent-sessions-title">
        <h2 id="recent-sessions-title" className="section-title mb-4 text-[1.75rem] lg:text-[2.35rem]">Recent sessions</h2>
        {sessions.length === 0 ? (
          <p className="border-y studio-rule px-3 py-3 text-sm text-stone-700 lg:px-6 lg:text-[1.125rem]">
            Your saved style collections will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-stone-200 border-y studio-rule">
            {sessions.map((session) => {
              const preview = session.analysis.styles[0];
              const image = preview && session.styleImages[preview.id];
              return (
                <li key={session.id} className="flex items-center gap-2 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => onRestore(session)}
                    className="group flex min-w-0 flex-1 items-center gap-3 rounded-md py-3 pr-1 text-left hover:bg-plum-50 sm:gap-5 sm:px-3"
                  >
                    {image && <img src={image} alt="" loading="lazy" className="h-17 w-13 shrink-0 rounded-sm object-cover" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{session.analysis.summary.headline}</span>
                      <span className="block truncate text-sm text-stone-600">{session.wizardData.goals || session.wizardData.occasion}</span>
                      <time dateTime={session.createdAt} className="mt-1 block text-xs text-stone-500">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </time>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-plum-700" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(session.id)}
                    className="grid size-11 shrink-0 place-items-center rounded-md text-stone-600 hover:bg-red-50 hover:text-red-800"
                    aria-label={'Delete saved session: ' + session.analysis.summary.headline}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
