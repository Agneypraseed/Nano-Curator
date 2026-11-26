import { Sparkle } from 'lucide-react';
import Button from './Button';
import { AppStage } from '../types';

const destinations = [
  { label: 'Home', stage: AppStage.HOME },
  { label: 'Style brief', stage: AppStage.WIZARD },
  { label: 'Wardrobe', stage: AppStage.WARDROBE },
  { label: 'Model settings', stage: AppStage.MODELS },
];

interface StudioHeaderProps {
  stage: AppStage;
  profileInitials: string | null;
  authLoading: boolean;
  onNavigate: (stage: AppStage) => void;
}

export function StudioHeader({ stage, profileInitials, authLoading, onNavigate }: StudioHeaderProps) {
  const activeStage = stage === AppStage.LOADING || stage === AppStage.RESULTS ? AppStage.WIZARD : stage;

  return (
    <header className="border-b studio-rule bg-stone-50">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <div className="studio-shell grid grid-cols-[1fr_auto] items-center md:min-h-[4.7rem] md:grid-cols-[1fr_auto_1fr]">
        <button
          type="button"
          onClick={() => onNavigate(AppStage.HOME)}
          className="col-start-1 row-start-1 flex min-h-15 w-fit items-center gap-2.5 text-left sm:gap-4"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-plum-700 text-white md:size-11">
            <Sparkle className="size-5 md:size-[1.65rem]" strokeWidth={1.55} aria-hidden="true" />
          </span>
          <span className="text-[1.2rem] font-bold leading-none tracking-[-0.05em] lg:text-[1.7rem]">Nano Curator</span>
        </button>

        <nav aria-label="Primary navigation" className="col-span-2 row-start-2 grid grid-cols-[0.8fr_1fr_0.95fr_1.35fr] md:col-span-1 md:col-start-2 md:row-start-1 md:flex md:min-h-[4.7rem] md:gap-2 lg:gap-8">
          {destinations.map(({ label, stage: destination }) => (
            <button
              key={destination}
              type="button"
              aria-current={activeStage === destination ? 'page' : undefined}
              onClick={() => onNavigate(destination)}
              className="min-h-11 border-b-[3px] border-transparent px-1.5 pt-[3px] text-center text-[0.8125rem] whitespace-nowrap text-stone-900 transition-colors hover:text-plum-700 aria-[current=page]:border-plum-700 aria-[current=page]:font-bold md:px-2 md:text-sm lg:text-[1.1875rem]"
            >
              {label}
            </button>
          ))}
        </nav>

        <Button
          variant="outline"
          disabled={authLoading}
          aria-label={profileInitials ? 'Open profile' : undefined}
          aria-current={stage === AppStage.PROFILE || stage === AppStage.AUTH ? 'page' : undefined}
          onClick={() => onNavigate(profileInitials ? AppStage.PROFILE : AppStage.AUTH)}
          className="col-start-2 row-start-1 justify-self-end md:col-start-3 lg:px-5 lg:text-lg"
        >
          {authLoading ? 'Checking…' : profileInitials || 'Sign in'}
        </Button>
      </div>
    </header>
  );
}
