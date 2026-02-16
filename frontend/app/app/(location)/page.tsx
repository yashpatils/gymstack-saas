import { redirect } from 'next/navigation';
import { getLocationSession } from './_components/location-server-api';

const STAFF_ROLES = new Set(['TENANT_LOCATION_ADMIN', 'GYM_STAFF_COACH']);

export default async function LocationHomePage() {
  const session = await getLocationSession();

  if (STAFF_ROLES.has(session.role)) {
    redirect('/app/members');
  }

  redirect('/app/my-attendance');
}
