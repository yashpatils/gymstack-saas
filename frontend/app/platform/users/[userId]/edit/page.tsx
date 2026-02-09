import EditUserClient from "./edit-user-client";

export function generateStaticParams() {
  return [];
}

export default function EditUserPage({
  params,
}: {
  params: { userId: string };
}) {
  return <EditUserClient userId={params.userId} />;
}
