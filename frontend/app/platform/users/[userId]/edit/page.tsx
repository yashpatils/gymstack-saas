import EditUserClient from "./edit-user-client";

export const dynamic = "force-dynamic";

export default function EditUserPage({
  params,
}: {
  params: { userId: string };
}) {
  return <EditUserClient userId={params.userId} />;
}
