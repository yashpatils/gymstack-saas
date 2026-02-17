'use client';

import { useMemo, useState } from 'react';
import { apiFetch } from '@/src/lib/apiFetch';
import { useToast } from '@/src/components/toast/ToastProvider';

type MemberRow = {
  memberId: string;
  email: string;
  joinedAt: string;
  membershipId: string;
};

type MembersClientProps = {
  initialMembers: MemberRow[];
};

export function MembersClient({ initialMembers }: MembersClientProps) {
  const [members] = useState(initialMembers);
  const [query, setQuery] = useState('');
  const [activeMember, setActiveMember] = useState<MemberRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const filteredMembers = useMemo(
    () => members.filter((member) => `${member.email} ${member.memberId}`.toLowerCase().includes(query.toLowerCase())),
    [members, query],
  );

  const handleCheckIn = async () => {
    if (!activeMember) {
      return;
    }

    try {
      setIsSubmitting(true);
      await apiFetch(`/api/location/members/${activeMember.memberId}/check-in`, {
        method: 'POST',
      });
      toast.success('Checked in', `${activeMember.email} was successfully checked in.`);
    } catch (error) {
      toast.error('Check-in failed', error instanceof Error ? error.message : 'Unable to check in member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Members</h2>
          <p className="text-sm text-slate-300">Search members and perform quick check-ins.</p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by email"
          className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-slate-900/80 text-left text-slate-300">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-slate-950/60">
            {filteredMembers.map((member) => (
              <tr key={member.membershipId}>
                <td className="px-4 py-3">{member.email}</td>
                <td className="px-4 py-3">{new Date(member.joinedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded-md border border-cyan-400/40 px-3 py-1 text-cyan-200 hover:bg-cyan-500/10"
                    onClick={() => setActiveMember(member)}
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeMember ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-lg font-semibold">{activeMember.email}</h3>
            <p className="mt-2 text-sm text-slate-300">Member ID: {activeMember.memberId}</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={isSubmitting}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
              >
                {isSubmitting ? 'Checking in...' : 'Check in'}
              </button>
              <button type="button" className="rounded-lg border border-white/20 px-4 py-2 text-sm" onClick={() => setActiveMember(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
