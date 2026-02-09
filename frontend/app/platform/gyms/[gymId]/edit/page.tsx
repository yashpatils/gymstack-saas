import EditGymClient from "./edit-gym-client";

export function generateStaticParams() {
  return [];
}

export default function EditGymPage({
  params,
}: {
  params: { gymId: string };
}) {
  return <EditGymClient gymId={params.gymId} />;
}
