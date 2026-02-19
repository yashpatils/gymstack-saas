'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SkeletonBlock } from '../common/SkeletonBlock';
import { type AiActionType, getWeeklyAiBrief, type WeeklyAiBrief } from '../../lib/aiBrief';
import { ApiFetchError } from '../../lib/apiFetch';

const ACTION_MAP: Record<AiActionType, { label: string; href: string }> = {
  INVITE_MEMBERS_BACK: { label: 'Invite inactive members', href: '/platform/invites' },
  CREATE_CLASS_SLOT: { label: 'Create class slot', href: '/platform/analytics/classes' },
  UPGRADE_PLAN: { label: 'Upgrade plan', href: '/platform/billing' },
};

export function WeeklyAiBriefCard() {
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState<WeeklyAiBrief | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getWeeklyAiBrief();
        if (active) {
          setBrief(response.insight);
        }
      } catch (loadError) {
        if (active) {
          if (loadError instanceof ApiFetchError && (loadError.statusCode === 403 || loadError.statusCode === 404)) {
            setError(null);
            setBrief(null);
          } else {
            setError('Unable to load AI brief right now.');
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Weekly AI Brief</h2>
        <p className="text-sm text-muted-foreground">Operational insights generated from tenant-level aggregated metrics.</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-11/12" />
          <SkeletonBlock className="h-4 w-10/12" />
          <SkeletonBlock className="h-4 w-9/12" />
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {!loading && brief ? (
        <>
          <p className="text-sm text-foreground/90">{brief.summary}</p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/85">
            {brief.insights.map((insight, index) => (
              <li key={`${insight.bullet}-${index}`}>{insight.bullet}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {brief.insights
              .map((item) => item.actionType)
              .filter((actionType): actionType is AiActionType => Boolean(actionType))
              .filter((actionType, index, array) => array.indexOf(actionType) === index)
              .map((actionType) => (
                <Link key={actionType} href={ACTION_MAP[actionType].href} className="button secondary">
                  {ACTION_MAP[actionType].label}
                </Link>
              ))}
          </div>
        </>
      ) : null}

      {!loading && !brief && !error ? (
        <p className="text-sm text-muted-foreground">Insights will appear here once enough activity is available for this tenant.</p>
      ) : null}
    </div>
  );
}
