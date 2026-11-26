import { ModelSelector } from '../wizard/ModelSelector';
import { PageIntro } from '../PageIntro';
import type { WizardState } from '../../types';

interface ModelSettingsPageProps {
  data: WizardState;
  apiKey: string;
  hasServerKey: boolean;
  localTextApiUrl: string;
  localVtonApiUrl: string;
  onChange: (patch: Partial<WizardState>) => void;
  onApiKeyChange: (value: string) => void;
  onLocalEndpointsChange: (patch: Partial<{ text: string; vton: string }>) => void;
}

export function ModelSettingsPage(props: ModelSettingsPageProps) {
  return (
    <div className="studio-shell py-6 pb-16 sm:py-9 sm:pb-20">
      <PageIntro title="Model settings" description="Choose a provider and configure the model for your style collections." />
      <ModelSelector {...props} />
    </div>
  );
}
