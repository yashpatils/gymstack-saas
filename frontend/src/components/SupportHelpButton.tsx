'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../providers/AuthProvider';
import { getLastApiRequestId } from '../lib/apiFetch';
import { buildSupportMailtoUrl } from '../lib/support';

export function SupportHelpButton() {
  const pathname = usePathname();
  const { user, activeContext } = useAuth();

  const supportHref = useMemo(() => {
    return buildSupportMailtoUrl(
      {
        tenantId: activeContext?.tenantId,
        userId: user?.id,
        requestId: getLastApiRequestId(),
        route: pathname,
      },
      '',
    );
  }, [activeContext?.tenantId, pathname, user?.id]);

  return (
    <a href={supportHref} className="button secondary" aria-label="Contact GymStack support">
      Help
    </a>
  );
}
