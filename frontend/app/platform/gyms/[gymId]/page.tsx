import GymDetailClient from "./gym-detail-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function GymDetailPage({
  params,
}: {
  params: { gymId: string };
}) {
  return <GymDetailClient gymId={params.gymId} />;
}
