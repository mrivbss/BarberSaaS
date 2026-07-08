import { ReactNode } from 'react';

interface PlaceholderViewProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  message: string;
}

import { PageHeader } from '../ui/PageHeader';
import { EmptyState } from '../ui/EmptyState';
import { PageTransition } from '../layout/PageTransition';

export function PlaceholderView({ title, subtitle, message }: PlaceholderViewProps) {
  return (
    <PageTransition className="p-8 lg:p-16 xl:p-24 max-w-7xl mx-auto">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="mt-24">
        <EmptyState title={message} />
      </div>
    </PageTransition>
  );
}
