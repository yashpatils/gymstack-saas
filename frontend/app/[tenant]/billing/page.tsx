"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  PageHeader,
  PageShell,
  SectionTitle,
  StatCard,
  Table,
} from "../../components/ui";
import { useBackendAction } from "../../components/use-backend-action";
import {
  createCheckoutSession,
  getSubscriptionStatus,
} from "../../lib/billing";
import { defaultSession } from "../../lib/auth";


export default function TenantBillingPage() {
  const { backendResponse, callBackend } = useBackendAction();
  const [checkoutState, setCheckoutState] = useState<{
    status: "idle" | "loading" | "error";
    message?: string;
  }>({ status: "idle" });
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    value?: string;
    customerId?: string | null;
    subscriptionId?: string | null;
    message?: string;
  }>({ status: "idle" });

  useEffect(() => {
    let isMounted = true;
    setSubscriptionStatus({ status: "loading" });
    getSubscriptionStatus(defaultSession.userId)
      .then((response) => {
        if (!isMounted) {
          return;
        }
        setSubscriptionStatus({
          status: "ready",
          value: response.subscriptionStatus,
          customerId: response.stripeCustomerId,
          subscriptionId: response.stripeSubscriptionId,
        });
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        setSubscriptionStatus({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load subscription status.",
        });
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleStartSubscription = async () => {
    setCheckoutState({ status: "loading" });

    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    if (!priceId) {
      setCheckoutState({
        status: "error",
        message: "Missing NEXT_PUBLIC_STRIPE_PRICE_ID configuration.",
      });
      return;
    }

    try {
      const subscriptionResponse = await createCheckoutSession({
        userId: defaultSession.userId,
        priceId,
      });

      if (subscriptionResponse.checkoutUrl) {
        window.location.href = subscriptionResponse.checkoutUrl;
        return;
      }

      setCheckoutState({
        status: "error",
        message: "Missing Stripe checkout URL.",
      });
    } catch (error) {
      setCheckoutState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to start checkout.",
      });
    }
  };

  const invoices = [
    {
      id: "INV-2024-0913",
      date: "Sep 01, 2024",
      amount: "$12,480.00",
      status: "Paid",
      method: "Visa •••• 4242",
    },
    {
      id: "INV-2024-0862",
      date: "Aug 01, 2024",
      amount: "$12,480.00",
      status: "Paid",
      method: "Visa •••• 4242",
    },
    {
      id: "INV-2024-0725",
      date: "Jul 01, 2024",
      amount: "$11,920.00",
      status: "Paid",
      method: "ACH •• 7831",
    },
    {
      id: "INV-2024-0630",
      date: "Jun 01, 2024",
      amount: "$11,640.00",
      status: "Processing",
      method: "ACH •• 7831",
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Membership plan management"
        subtitle="Design, launch, and maintain membership offerings with clear pricing, perks, and renewal controls."
        actions={
          <Button onClick={() => callBackend("New plan")}>New plan</Button>
        }
      />
      {backendResponse ? (
        <p className="text-sm text-slate-400">
          Backend response: {backendResponse}
        </p>
      ) : null}

      <div className="grid grid-3">
        <StatCard
          label="Monthly recurring revenue"
          value="$84,120"
          detail="+8% from last month"
        />
        <Card
          title="Plan upgrades"
          description="112 members upgraded this quarter."
          footer={<Badge tone="success">Higher value mix</Badge>}
        />
        <Card
          title="Renewal risk"
          description="26 members flagged for outreach."
          footer={<Badge tone="warning">Save playbook running</Badge>}
        />
      </div>

      <section className="section">
        <SectionTitle>Plans overview</SectionTitle>
        <div className="plan-grid">
          <div className="plan-card">
            <div className="plan-card-header">
              <div>
                <h3>Standard</h3>
                <p>Best for consistent gym-goers.</p>
              </div>
              <Badge>Live</Badge>
            </div>
            <div className="plan-price">
              $59<span>/mo</span>
            </div>
            <ul className="plan-list">
              <li>24/7 facility access</li>
              <li>2 guest passes monthly</li>
              <li>Basic wellness tracking</li>
            </ul>
            <div className="plan-actions">
              <Button
                variant="secondary"
                onClick={() => callBackend("Edit plan")}
              >
                Edit plan
              </Button>
              <Button
                variant="ghost"
                onClick={() => callBackend("Duplicate")}
              >
                Duplicate
              </Button>
            </div>
          </div>

          <div className="plan-card featured">
            <div className="plan-card-header">
              <div>
                <h3>Premium</h3>
                <p>Top plan with coaching sessions.</p>
              </div>
              <Badge tone="success">Top plan</Badge>
            </div>
            <div className="plan-price">
              $99<span>/mo</span>
            </div>
            <ul className="plan-list">
              <li>Unlimited group classes</li>
              <li>Quarterly body composition scan</li>
              <li>Priority support</li>
            </ul>
            <div className="plan-actions">
              <Button onClick={() => callBackend("Review perks")}>
                Review perks
              </Button>
              <Button
                variant="ghost"
                onClick={() => callBackend("Message members")}
              >
                Message members
              </Button>
            </div>
          </div>

          <div className="plan-card">
            <div className="plan-card-header">
              <div>
                <h3>Elite</h3>
                <p>High-touch training and recovery.</p>
              </div>
              <Badge tone="warning">Review</Badge>
            </div>
            <div className="plan-price">
              $149<span>/mo</span>
            </div>
            <ul className="plan-list">
              <li>Weekly 1:1 coaching</li>
              <li>Unlimited recovery suite</li>
              <li>Custom nutrition plan</li>
            </ul>
            <div className="plan-actions">
              <Button
                variant="secondary"
                onClick={() => callBackend("Adjust pricing")}
              >
                Adjust pricing
              </Button>
              <Button
                variant="ghost"
                onClick={() => callBackend("Pause enrollment")}
              >
                Pause enrollment
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-split">
          <SectionTitle>Stripe subscription setup</SectionTitle>
          <Button
            onClick={handleStartSubscription}
            disabled={checkoutState.status === "loading"}
          >
            {checkoutState.status === "loading"
              ? "Redirecting..."
              : "Start Stripe checkout"}
          </Button>
        </div>
        <Card
          title="Connect Stripe billing"
          description="Create a Stripe customer, attach a subscription, and redirect to checkout in test mode."
        >
          <div className="grid grid-2">
            <div>
              <p className="text-sm text-slate-400">
                Customer: {defaultSession.name} ({defaultSession.email})
              </p>
              <p className="text-sm text-slate-400">
                Price ID: {process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? "Unset"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">
                Publishable key:{" "}
                {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                  ? "Configured"
                  : "Unset"}
              </p>
              <p className="text-sm text-slate-400">
                API URL: {process.env.NEXT_PUBLIC_API_URL ?? "Unset"}
              </p>
            </div>
          </div>
          {checkoutState.status === "error" ? (
            <p className="mt-4 text-sm text-rose-300">{checkoutState.message}</p>
          ) : null}
        </Card>
        <Card
          title="Current subscription status"
          description="Live status pulled from the billing service."
        >
          {subscriptionStatus.status === "loading" ? (
            <p className="text-sm text-slate-400">
              Loading subscription status...
            </p>
          ) : null}
          {subscriptionStatus.status === "error" ? (
            <p className="text-sm text-rose-300">
              {subscriptionStatus.message}
            </p>
          ) : null}
          {subscriptionStatus.status === "ready" ? (
            <div className="grid gap-2 text-sm text-slate-200">
              <div>
                Status:{" "}
                <Badge tone="success">
                  {subscriptionStatus.value ?? "Unknown"}
                </Badge>
              </div>
              <div className="text-slate-400">
                Customer ID: {subscriptionStatus.customerId ?? "Not connected"}
              </div>
              <div className="text-slate-400">
                Subscription ID:{" "}
                {subscriptionStatus.subscriptionId ?? "Not started"}
              </div>
            </div>
          ) : null}
        </Card>
      </section>

      <section className="section">
        <div className="section-split">
          <SectionTitle>Plan activity</SectionTitle>
          <Button
            variant="secondary"
            onClick={() => callBackend("Export report")}
          >
            Export report
          </Button>
        </div>
        <Card title="Active plans" description="Configure pricing, perks, and enrollment status.">
          <Table
            headers={["Plan", "Price", "Members", "Status", "Renewal cadence"]}
            rows={[
              ["Standard", "$59/mo", "772", <Badge>Live</Badge>, "Monthly"],
              [
                "Premium",
                "$99/mo",
                "348",
                <Badge tone="success">Top plan</Badge>,
                "Monthly",
              ],
              [
                "Elite",
                "$149/mo",
                "128",
                <Badge tone="warning">Review</Badge>,
                "Quarterly",
              ],
            ]}
          />
        </Card>
      </section>

      <section className="section">
        <SectionTitle>Modal previews</SectionTitle>
        <div className="grid grid-2">
          <div className="modal-preview">
            <div className="modal-scrim" />
            <div className="modal-card">
              <div className="modal-header">
                <div>
                  <h3>Create a new plan</h3>
                  <p>Launch a limited-time offer for summer.</p>
                </div>
                <Badge>Draft</Badge>
              </div>
              <div className="modal-body">
                <div className="modal-row">
                  <span>Billing cadence</span>
                  <strong>Monthly</strong>
                </div>
                <div className="modal-row">
                  <span>Included sessions</span>
                  <strong>4 group + 1 PT</strong>
                </div>
                <div className="modal-row">
                  <span>Intro discount</span>
                  <strong>15% for 2 months</strong>
                </div>
              </div>
              <div className="modal-actions">
                <Button
                  variant="secondary"
                  onClick={() => callBackend("Save draft")}
                >
                  Save draft
                </Button>
                <Button onClick={() => callBackend("Publish plan")}>
                  Publish plan
                </Button>
              </div>
            </div>
          </div>

          <div className="modal-preview">
            <div className="modal-scrim" />
            <div className="modal-card">
              <div className="modal-header">
                <div>
                  <h3>Pause enrollment</h3>
                  <p>Manage demand before the fall rush.</p>
                </div>
                <Badge tone="warning">Requires review</Badge>
              </div>
              <div className="modal-body">
                <div className="modal-row">
                  <span>Plan impacted</span>
                  <strong>Elite</strong>
                </div>
                <div className="modal-row">
                  <span>Reopen date</span>
                  <strong>Oct 15, 2024</strong>
                </div>
                <div className="modal-row">
                  <span>Member communication</span>
                  <strong>Notify active members</strong>
                </div>
              </div>
              <div className="modal-actions">
                <Button variant="ghost" onClick={() => callBackend("Cancel")}>
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => callBackend("Schedule pause")}
                >
                  Schedule pause
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
