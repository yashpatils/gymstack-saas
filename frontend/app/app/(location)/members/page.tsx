import { getServerToken, locationApiFetch } from '../_components/location-server-api';
import { MembersClient } from './members-client';

type MemberRow = {
  memberId: string;
  email: string;
  joinedAt: string;
  membershipId: string;
};

export default async function MembersPage() {
  const token = getServerToken();
  const members = await locationApiFetch<MemberRow[]>('/api/location/members', token);

  return <MembersClient initialMembers={members} />;
}
