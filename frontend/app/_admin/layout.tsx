import { redirect } from 'next/navigation';

export default function LegacyAdminLayout(): never {
  redirect('/admin');
}
