import Link from "next/link";
import { BarberAcceptingControl } from "@/features/dashboard/schedule/BarberAcceptingControl";
import { BlockForm } from "@/features/dashboard/schedule/BlockForm";
import { UnblockButton } from "@/features/dashboard/schedule/UnblockButton";
import { DataTable, EmptyState, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { effectiveCapabilities } from "@/lib/auth/capabilities";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { listTimeBlocks } from "@/lib/booking/blocks";
import { loadSchedule } from "@/lib/booking/schedule";
import { addLocalCalendarDays, businessDate, isValidLocalDate } from "@/lib/booking/time";
import { getMongo } from "@/lib/db/mongo";

export const metadata = { title: "Schedule | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

const TIME = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const WHEN = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });
const DAY = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const STATUS_LABELS = { pending: "Pending", confirmed: "Confirmed", completed: "Completed", no_show: "No-show" };
const range = (item) => `${TIME.format(new Date(item.startsAt))} to ${TIME.format(new Date(item.endsAt))}`;
const first = (value) => (Array.isArray(value) ? value[0] : value) ?? "";

function ScheduleItem({ item, date, barberSlug, can }) {
  if (item.type === "booking") {
    return (
      <li>
        <Link className={`dash-schedule-item dash-schedule-item--${item.status}`} href={`/admin/bookings/all?q=${item.id}`} aria-label={`Open booking: ${item.customerName}, ${range(item)}, ${STATUS_LABELS[item.status]}`}>
          <strong>{range(item)}</strong>{item.customerName} · {item.services.join(", ")} · {STATUS_LABELS[item.status]}
        </Link>
      </li>
    );
  }
  if (item.type === "block") {
    return <li><div className="dash-schedule-item dash-schedule-item--block"><strong>{range(item)}</strong>Blocked ({item.scope === "shop" ? "whole shop" : "this barber"}){item.reason ? `: ${item.reason}` : ""}</div></li>;
  }
  if (item.type === "break") return <li><div className="dash-schedule-item dash-schedule-item--break"><strong>{range(item)}</strong>Break</div></li>;
  const from = new Date(item.startsAt);
  const to = new Date(item.endsAt);
  const hhmm = (instant) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/New_York" }).format(instant);
  const blockHref = `/admin/schedule?date=${date}&barber=${barberSlug}&startTime=${hhmm(from)}&endTime=${hhmm(to)}#block-form`;
  return (
    <li>
      <div className="dash-schedule-item dash-schedule-item--free">
        <strong>{range(item)}</strong>Free
        <span className="dash-schedule-links">
          {can["bookings.walkIn"] ? <Link className="dash-link-button" href="/admin/bookings/walk-in">Walk-in</Link> : null}
          {can["availability.block"] ? <Link className="dash-link-button" href={blockHref}>Block</Link> : null}
        </span>
      </div>
    </li>
  );
}

export default async function AdminSchedulePage({ searchParams }) {
  const user = await requireDashboardAccess("admin", { capability: "availability.view" });
  const can = await effectiveCapabilities(user.role);
  const params = await searchParams;
  const today = businessDate(new Date());
  const date = isValidLocalDate(first(params.date)) ? first(params.date) : today;
  const week = first(params.view) === "week";
  const barberFilter = /^[a-z0-9-]{1,100}$/.test(first(params.barber)) ? first(params.barber) : "";
  const { db } = await getMongo();

  const days = await loadSchedule(db, { localDate: date, days: week ? 7 : 1, barberSlug: week ? barberFilter : barberFilter });
  const blocks = await listTimeBlocks(db, { from: new Date() });
  const barbers = (await db.collection("barber").find({ archivedAt: { $exists: false } }).sort({ name: 1 }).toArray()).map((barber) => ({ id: String(barber._id), slug: barber.slug, name: barber.name, active: barber.active !== false, accepting: barber.acceptingBookings !== false, pausedUntil: barber.pausedUntil ?? "", pauseNote: barber.pauseNote ?? "" }));
  const barberName = new Map(barbers.map((barber) => [barber.id, barber.name]));

  const defaults = { date: first(params.date) && isValidLocalDate(first(params.date)) ? first(params.date) : today, barber: barberFilter, startTime: /^\d{2}:\d{2}$/.test(first(params.startTime)) ? first(params.startTime) : "", endTime: /^\d{2}:\d{2}$/.test(first(params.endTime)) ? first(params.endTime) : "" };
  const link = (extra) => `/admin/schedule?${new URLSearchParams({ date, ...(week ? { view: "week" } : {}), ...(barberFilter ? { barber: barberFilter } : {}), ...extra }).toString()}`;
  const paused = barbers.filter((barber) => barber.active && !barber.accepting).length;

  const blockRows = blocks.map((block) => ({
    id: block.id,
    cells: {
      who: block.barberId ? barberName.get(block.barberId) ?? "Barber" : "Whole shop",
      when: `${WHEN.format(new Date(block.startsAt))} to ${WHEN.format(new Date(block.endsAt))}`,
      reason: block.reason || <span className="dash-muted">No reason</span>,
      actions: can["availability.unblock"] ? <UnblockButton id={block.id} label={`${block.barberId ? barberName.get(block.barberId) ?? "barber" : "whole shop"}, ${WHEN.format(new Date(block.startsAt))}`} /> : <span className="dash-muted">View only</span>,
    },
  }));

  return (
    <>
      <PageHeader eyebrow="Schedule" title="Schedule and availability" description="See each barber's day or week, block time, and stop new bookings for a barber. None of this ever cancels or changes an existing appointment: a block that would overlap one is refused and the appointments are listed." />
      <div className="dash-stat-grid">
        <StatCard label="Blocked times coming up" value={blocks.length} icon="shield" />
        <StatCard label="Barbers not taking bookings" value={paused} icon="razor" hint={paused > 0 ? "Shown as unavailable on the booking page" : undefined} />
      </div>

      <Panel title={week ? "Week" : "Day"}>
        <form className="dash-form dash-filter-form" method="get">
          <div className="dash-form-row">
            <div className="dash-field">
              <label htmlFor="sc-date">Date</label>
              <input id="sc-date" name="date" type="date" defaultValue={date} />
            </div>
            <div className="dash-field">
              <label htmlFor="sc-view">View</label>
              <select id="sc-view" name="view" defaultValue={week ? "week" : "day"}>
                <option value="day">Day</option>
                <option value="week">Week</option>
              </select>
            </div>
            <div className="dash-field">
              <label htmlFor="sc-barber">Barber</label>
              <select id="sc-barber" name="barber" defaultValue={barberFilter}>
                <option value="">All barbers</option>
                {barbers.filter((barber) => barber.active).map((barber) => <option key={barber.slug} value={barber.slug}>{barber.name}</option>)}
              </select>
            </div>
          </div>
          <div className="dash-form-actions">
            <button className="button button-small" type="submit"><span>Show</span></button>
            <Link className="dash-link-button" href={link({ date: addLocalCalendarDays(date, week ? -7 : -1) })}>{week ? "Previous week" : "Previous day"}</Link>
            <Link className="dash-link-button" href={link({ date: addLocalCalendarDays(date, week ? 7 : 1) })}>{week ? "Next week" : "Next day"}</Link>
            <Link className="dash-link-button" href={link({ date: today })}>Today</Link>
          </div>
        </form>
        <ul className="dash-schedule-legend" aria-label="Legend">
          <li className="is-confirmed">Booked (gold edge)</li>
          <li className="is-block">Blocked</li>
          <li className="is-break">Break</li>
          <li>Free (dashed)</li>
        </ul>
        {days.every((day) => day.barbers.length === 0) ? (
          <EmptyState icon="razor" title="No barbers to show" text="Add or turn on a barber first." action={{ href: "/admin/barbers", label: "Barbers" }} />
        ) : (
          days.map((day) => (
            <section key={day.date} aria-label={DAY.format(new Date(`${day.date}T12:00:00Z`))}>
              {week ? <h3>{DAY.format(new Date(`${day.date}T12:00:00Z`))}</h3> : null}
              <div className="dash-schedule-grid">
                {day.barbers.map((barber) => (
                  <div className="dash-schedule-col" key={barber.id}>
                    <h3>{barber.name}</h3>
                    {barber.state === "off" ? <small className="dash-muted">Not working</small> : null}
                    {barber.state === "paused" ? <small className="dash-muted">Not taking bookings{barber.pausedUntil ? ` until ${barber.pausedUntil}` : ""}{barber.pauseNote ? `: ${barber.pauseNote}` : ""}</small> : null}
                    {barber.items.length ? (
                      <ul className="dash-schedule-list">
                        {barber.items.map((item, index) => <ScheduleItem key={`${item.type}-${item.id ?? index}-${item.startsAt}`} item={item} date={day.date} barberSlug={barber.slug} can={can} />)}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </Panel>

      {can["availability.block"] ? (
        <Panel title="Block time">
          <BlockForm barbers={barbers.filter((barber) => barber.active)} defaults={defaults} />
        </Panel>
      ) : null}

      <Panel title="Blocked times">
        <DataTable
          caption="Blocked times"
          columns={[{ key: "who", label: "Who" }, { key: "when", label: "When" }, { key: "reason", label: "Reason (dashboard only)" }, { key: "actions", label: "Actions" }]}
          rows={blockRows}
          emptyTitle="Nothing is blocked"
          emptyText="Blocked times appear here. Customers only see them as Unavailable."
        />
      </Panel>

      <Panel title="Accepting bookings">
        {barbers.filter((barber) => barber.active).length === 0 ? (
          <EmptyState icon="razor" title="No active barbers" text="Turn a barber on from the Barbers page." />
        ) : (
          <ul className="dash-schedule-list">
            {barbers.filter((barber) => barber.active).map((barber) => (
              <li key={barber.slug}>
                <div className="dash-schedule-item">
                  <strong>{barber.name}: {barber.accepting ? "taking bookings" : `not taking bookings${barber.pausedUntil ? ` until ${barber.pausedUntil}` : ""}`}</strong>
                  {barber.pauseNote && !barber.accepting ? <small className="dash-muted">{barber.pauseNote}</small> : null}
                  {can["availability.barberToggle"] ? <BarberAcceptingControl slug={barber.slug} name={barber.name} accepting={barber.accepting} pausedUntil={barber.pausedUntil} pauseNote={barber.pauseNote} /> : <small className="dash-muted">View only</small>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
