"use client";

import { Button, PageHeader } from "../components/ui";
import { useBackendAction } from "../components/use-backend-action";

export function TenantHomeHeader() {
  const { backendResponse, callBackend } = useBackendAction();

  return (
    <>
      <PageHeader
        title="Welcome back"
        subtitle="Start with a quick snapshot or head straight to your daily operations."
        actions={
          <Button onClick={() => callBackend("Open dashboard")}>
            Open dashboard
          </Button>
        }
      />
      {backendResponse ? (
        <p className="text-sm text-slate-400">
          Backend response: {backendResponse}
        </p>
      ) : null}
    </>
  );
}
