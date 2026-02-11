import UserDetailClient from "./user-detail-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function UserDetailPage({
  params,
}: {
  params: { userId: string };
}) {
  return <UserDetailClient userId={params.userId} />;
}
