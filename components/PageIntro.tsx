import type { ReactNode } from 'react';

interface PageIntroProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageIntro({ title, description, action }: PageIntroProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 sm:mb-8">
      <div className="max-w-3xl">
        <h1 className="page-title">{title}</h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-stone-700 sm:text-lg">{description}</p>
      </div>
      {action}
    </div>
  );
}
