import EditGymClient from "./edit-gym-client";

export const dynamic = "force-dynamic";

export default function EditGymPage({
  params,
}: {
  params: { gymId: string };
}) {
  return <EditGymClient gymId={params.gymId} />;
}
