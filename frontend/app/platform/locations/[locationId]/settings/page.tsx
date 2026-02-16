import LocationSettingsClient from "../../settings/location-settings-client";

export default async function LocationSettingsByIdPage({ params }: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await params;
  return <LocationSettingsClient initialLocationId={locationId} />;
}
