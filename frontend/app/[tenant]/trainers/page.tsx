import React from "react";

import {
  Badge,
  Button,
  Card,
  PageHeader,
  PageShell,
  SectionTitle,
  Table,
} from "../../components/ui";

export default function TenantTrainersPage() {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const times = [
    "6:00 AM",
    "8:00 AM",
    "10:00 AM",
    "12:00 PM",
    "2:00 PM",
    "4:00 PM",
    "6:00 PM",
    "8:00 PM",
  ];
  const schedule: Record<string, { title: string; note: string; tone?: string }> =
    {
      "Monday-6:00 AM": {
        title: "Sunrise Strength",
        note: "Priya · 14 members",
        tone: "primary",
      },
      "Monday-6:00 PM": {
        title: "Cardio Blast",
        note: "Marcus · 18 members",
        tone: "success",
      },
      "Tuesday-8:00 AM": {
        title: "Mobility Flow",
        note: "Sofia · 9 members",
        tone: "primary",
      },
      "Tuesday-4:00 PM": {
        title: "Power Circuit",
        note: "Priya · 12 members",
        tone: "warning",
      },
      "Wednesday-10:00 AM": {
        title: "Small Group PT",
        note: "Marcus · 4 members",
        tone: "primary",
      },
      "Wednesday-6:00 PM": {
        title: "Performance Lab",
        note: "Sofia · 11 members",
        tone: "success",
      },
      "Thursday-8:00 AM": {
        title: "Core & Balance",
        note: "Priya · 10 members",
        tone: "primary",
      },
      "Thursday-2:00 PM": {
        title: "Trainer 1:1 Blocks",
        note: "Open · 3 slots",
        tone: "warning",
      },
      "Friday-12:00 PM": {
        title: "Lunch Express",
        note: "Marcus · 16 members",
        tone: "success",
      },
      "Friday-6:00 PM": {
        title: "HIIT Ignite",
        note: "Sofia · 20 members",
        tone: "primary",
      },
      "Saturday-10:00 AM": {
        title: "Weekend Challenge",
        note: "Priya · 22 members",
        tone: "success",
      },
      "Sunday-8:00 AM": {
        title: "Recovery Yoga",
        note: "Guest · 12 members",
        tone: "primary",
      },
    };

  return (
    <PageShell>
      <PageHeader
        title="Trainers"
        subtitle="Balance coverage, manage availability, and track trainer impact."
        actions={<Button>Schedule session</Button>}
      />

      <div className="grid grid-3">
        <Card
          title="Active trainers"
          description="18 trainers are scheduled this week."
          footer={<Badge tone="success">+3 new hires</Badge>}
        />
        <Card
          title="Coverage gaps"
          description="2 peak-time slots are unassigned."
          footer={<Badge tone="warning">Needs coverage</Badge>}
        />
        <Card
          title="Session quality"
          description="Average rating 4.8 / 5 from members."
        />
      </div>

      <section className="section">
        <SectionTitle>Weekly schedule</SectionTitle>
        <Card
          title="Trainer scheduling calendar"
          description="Coordinate classes, 1:1 sessions, and coverage gaps in a single weekly view."
        >
          <div className="calendar-controls">
            <div className="calendar-meta">
              <p className="calendar-range">Aug 12 - Aug 18</p>
              <p className="calendar-subtitle">
                42 sessions · 6 open blocks · 3 waitlists
              </p>
            </div>
            <div className="calendar-actions">
              <Button variant="secondary">Add session</Button>
              <Button variant="ghost">Sync trainers</Button>
            </div>
          </div>
          <div className="calendar-grid">
            <div className="calendar-header"></div>
            {days.map((day) => (
              <div key={day} className="calendar-header">
                <span>{day}</span>
                <span className="calendar-header-sub">6am-9pm</span>
              </div>
            ))}
            {times.map((time) => (
              <React.Fragment key={time}>
                <div className="calendar-time">{time}</div>
                {days.map((day) => {
                  const entry = schedule[`${day}-${time}`];
                  return (
                    <div key={`${day}-${time}`} className="calendar-cell">
                      {entry ? (
                        <div
                          className={`calendar-event${
                            entry.tone ? ` ${entry.tone}` : ""
                          }`}
                        >
                          <p className="calendar-event-title">
                            {entry.title}
                          </p>
                          <p className="calendar-event-note">{entry.note}</p>
                        </div>
                      ) : (
                        <span className="calendar-empty">Open</span>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="calendar-legend">
            <span className="calendar-legend-item">
              <span className="legend-dot primary" /> Scheduled class
            </span>
            <span className="calendar-legend-item">
              <span className="legend-dot success" /> Full capacity
            </span>
            <span className="calendar-legend-item">
              <span className="legend-dot warning" /> Needs coverage
            </span>
          </div>
        </Card>
      </section>

      <section className="section">
        <SectionTitle>Trainer roster</SectionTitle>
        <Card title="Availability overview" description="Updated every 30 minutes.">
          <Table
            headers={["Trainer", "Specialty", "Next Slot", "Status"]}
            rows={[
              ["Priya Shah", "Strength & HIIT", "10:30 AM", <Badge>Open</Badge>],
              [
                "Marcus Reed",
                "Mobility",
                "1:00 PM",
                <Badge tone="success">Booked</Badge>,
              ],
              [
                "Sofia Brooks",
                "Performance",
                "3:30 PM",
                <Badge tone="warning">On call</Badge>,
              ],
            ]}
          />
        </Card>
      </section>
    </PageShell>
  );
}
