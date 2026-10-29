import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { getBookingConfig, getSiteSettings } from "@/lib/catalog/source";
import { getImage } from "@/lib/images/server";
import { formatAddress, formatClosures, formatOpeningHours, mailtoHref, mapsHref, socialLinks, telHref, timeZoneLabel } from "@/lib/site/contact";

// Contact information card. Renders only the fields filled in config/site.js; if none are, one neutral line.
export async function ContactInfoCard() {
  const site = await getSiteSettings();
  const phone = telHref(site.contact.phone);
  const email = mailtoHref(site.contact.email);
  const address = formatAddress(site.location);
  const maps = mapsHref(site.location);
  const social = socialLinks(site.social);
  const hasAny = phone || email || address || social.length > 0;

  return (
    <section className="contact-card" aria-labelledby="contact-info-title">
      <h2 id="contact-info-title">Contact information</h2>
      {hasAny ? (
        <ul className="contact-info-list">
          {phone ? <li><span>Phone</span><a href={phone}>{site.contact.phone}</a></li> : null}
          {email ? <li><span>Email</span><a href={email}>{site.contact.email}</a></li> : null}
          {address ? <li><span>Address</span>{maps ? <a href={maps} target="_blank" rel="noopener noreferrer">{address}</a> : address}</li> : null}
          {social.length > 0 ? (
            <li>
              <span>Follow us</span>
              <span className="contact-social-row">
                {social.map((item) => <a key={item.name} href={item.url} target="_blank" rel="noopener noreferrer">{item.name}</a>)}
              </span>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="contact-empty">Contact details coming soon.</p>
      )}
    </section>
  );
}

export async function OpeningHoursCard() {
  const config = await getBookingConfig();
  const hours = formatOpeningHours(config.openingHours);
  const { closed, extraDates, earlyClose } = formatClosures(config.holidays);
  const zone = timeZoneLabel(config.timeZone);

  return (
    <section className="contact-card" aria-labelledby="contact-hours-title">
      <h2 id="contact-hours-title">Opening hours <small>({zone})</small></h2>
      <ul className="contact-hours-list">
        {hours.map((row) => <li key={row.days}><span>{row.days}</span><span>{row.hours}</span></li>)}
      </ul>
      {closed.length > 0 || extraDates.length > 0 || earlyClose ? (
        <p className="contact-closures">
          {closed.length > 0 ? <>Closed: {closed.join(", ")}.</> : null}
          {extraDates.length > 0 ? <> Also closed: {extraDates.join(", ")}.</> : null}
          {earlyClose ? <> {earlyClose}.</> : null}
        </p>
      ) : null}
    </section>
  );
}

// Styled map card (no embed, no API key). The Google Maps button exists only when an address is set.
export async function MapCard() {
  const site = await getSiteSettings();
  const backdrop = getImage("contact-map-backdrop");
  const address = formatAddress(site.location);
  const maps = mapsHref(site.location);

  return (
    <section className="contact-card contact-map-card" aria-labelledby="contact-map-title">
      <ImageWithFallback src={backdrop.src} alt="" aria-hidden="true" fill sizes="(max-width: 980px) 100vw, 520px" style={{ objectPosition: backdrop.objectPosition }} />
      <div className="contact-map-overlay" aria-hidden="true" />
      <div className="contact-map-copy">
        <h2 id="contact-map-title">Find us</h2>
        <p>{address ?? `${site.location.city}, ${site.location.region}. The street address will be published soon.`}</p>
        {maps ? <a className="button button-small" href={maps} target="_blank" rel="noopener noreferrer"><span>Open in Google Maps</span></a> : null}
      </div>
    </section>
  );
}
