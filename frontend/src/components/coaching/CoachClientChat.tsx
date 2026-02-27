'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../common/EmptyState';
import { ErrorState, LoadingState } from '../platform/data';
import { useAuth } from '../../providers/AuthProvider';
import { CoachingAssignment, CoachingMessage, createAssignment, listAssignments, listMessages, markRead, sendMessage } from '../../lib/coachingMessaging';

type ChatMode = 'coach' | 'client';

export function CoachClientChat({ mode }: { mode: ChatMode }) {
  const { user, effectiveRole, activeContext } = useAuth();
  const [assignments, setAssignments] = useState<CoachingAssignment[]>([]);
  const [messages, setMessages] = useState<CoachingMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [mobileListView, setMobileListView] = useState(true);
  const [assignForm, setAssignForm] = useState({
    locationId: activeContext?.locationId ?? '',
    coachUserId: user?.id ?? '',
    clientUserId: '',
  });

  const selectedAssignment = useMemo(() => assignments.find((assignment) => assignment.id === selectedId) ?? null, [assignments, selectedId]);
  const canAssign = effectiveRole === 'TENANT_OWNER' || effectiveRole === 'TENANT_LOCATION_ADMIN';

  useEffect(() => {
    setAssignForm((current) => ({ ...current, locationId: activeContext?.locationId ?? current.locationId, coachUserId: mode === 'coach' ? user?.id ?? current.coachUserId : current.coachUserId }));
  }, [activeContext?.locationId, mode, user?.id]);

  useEffect(() => {
    let mounted = true;
    setLoadingAssignments(true);
    setError(null);
    listAssignments()
      .then((items) => {
        if (!mounted) return;
        setAssignments(items);
        if (!selectedId && items.length > 0) {
          setSelectedId(items[0].id);
        }
      })
      .catch((loadError) => {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load assignments.');
      })
      .finally(() => {
        if (mounted) setLoadingAssignments(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    let mounted = true;
    setLoadingMessages(true);
    listMessages(selectedId)
      .then((response) => {
        if (!mounted) return;
        const sorted = [...response.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        setMessages(sorted);
        return markRead(selectedId);
      })
      .catch((loadError) => {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load messages.');
      })
      .finally(() => {
        if (mounted) setLoadingMessages(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedId]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || !draft.trim()) return;

    const optimistic: CoachingMessage = {
      id: `tmp-${Date.now()}`,
      senderUserId: user?.id ?? 'me',
      body: draft.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimistic]);
    const currentDraft = draft;
    setDraft('');

    try {
      const sent = await sendMessage(selectedId, currentDraft);
      setMessages((current) => [...current.filter((message) => message.id !== optimistic.id), sent]);
    } catch (sendError) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setDraft(currentDraft);
      setError(sendError instanceof Error ? sendError.message : 'Unable to send message.');
    }
  }

  async function handleCreateAssignment(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await createAssignment(assignForm);
      setAssignments((current) => [created, ...current]);
      setSelectedId(created.id);
      setAssignForm((current) => ({ ...current, clientUserId: '' }));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create assignment.');
    }
  }

  const listTitle = mode === 'coach' ? 'Assigned clients' : 'Assigned coaches';

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem,minmax(0,1fr)]">
      <aside className={`rounded-2xl border border-border bg-card/70 p-4 ${mobileListView ? 'block' : 'hidden'} lg:block`}>
        <h2 className="text-sm font-semibold">{listTitle}</h2>
        {loadingAssignments ? <LoadingState message="Loading conversations..." /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loadingAssignments && assignments.length === 0 ? <EmptyState title="No conversations" description="Assignments will appear here." /> : null}
        <div className="mt-3 space-y-2 overflow-y-auto">
          {assignments.map((assignment) => {
            const other = mode === 'coach' ? assignment.client : assignment.coach;
            return (
              <button
                type="button"
                key={assignment.id}
                onClick={() => {
                  setSelectedId(assignment.id);
                  setMobileListView(false);
                }}
                className={`w-full rounded-xl border p-3 text-left ${selectedId === assignment.id ? 'border-cyan-400 bg-cyan-500/10' : 'border-border'}`}
              >
                <p className="truncate text-sm font-medium">{other?.name || other?.email || 'Unknown user'}</p>
                <p className="truncate text-xs text-muted-foreground">{assignment.lastMessageAt ? new Date(assignment.lastMessageAt).toLocaleString() : 'No messages yet'}</p>
              </button>
            );
          })}
        </div>
        {canAssign ? (
          <form className="mt-4 space-y-2 border-t border-border pt-4" onSubmit={handleCreateAssignment}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assign client</p>
            <input className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" placeholder="Location ID" value={assignForm.locationId} onChange={(event) => setAssignForm((current) => ({ ...current, locationId: event.target.value }))} required />
            <input className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" placeholder="Coach user ID" value={assignForm.coachUserId} onChange={(event) => setAssignForm((current) => ({ ...current, coachUserId: event.target.value }))} required />
            <input className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" placeholder="Client user ID" value={assignForm.clientUserId} onChange={(event) => setAssignForm((current) => ({ ...current, clientUserId: event.target.value }))} required />
            <button className="button w-full" type="submit">Create assignment</button>
          </form>
        ) : null}
      </aside>

      <section className={`min-w-0 rounded-2xl border border-border bg-card/70 p-4 ${mobileListView ? 'hidden' : 'block'} lg:block`}>
        {!mobileListView ? <button type="button" className="mb-2 text-xs text-cyan-300 lg:hidden" onClick={() => setMobileListView(true)}>← Back to conversations</button> : null}
        {!selectedAssignment ? (
          <EmptyState title="Select a conversation" description="Choose a coach/client thread to start chatting." />
        ) : (
          <>
            <div className="mb-3 border-b border-border pb-2">
              <h3 className="font-semibold">{mode === 'coach' ? selectedAssignment.client?.name || selectedAssignment.client?.email : selectedAssignment.coach?.name || selectedAssignment.coach?.email}</h3>
            </div>
            {loadingMessages ? <LoadingState message="Loading messages..." /> : null}
            <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {messages.map((message) => (
                <div key={message.id} className={`rounded-xl p-3 text-sm ${message.senderUserId === user?.id ? 'ml-auto max-w-[80%] bg-cyan-500/20' : 'max-w-[80%] bg-muted/30'}`}>
                  <p>{message.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={handleSend}>
              <input className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message" />
              <button className="button" type="submit">Send</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
