import { BOOKING_CONFIG } from "@/config/booking";
import { site } from "@/config/site";
import { formatAddress, formatOpeningHours, mailtoHref, mapsHref, socialLinks, telHref } from "@/lib/site/contact";

// Renders only what config/site.js provides; opening hours come from config/booking.js.
export function ContactDetails({ className = "" }) {
  const phone = telHref(site.contact.phone);
  const email = mailtoHref(site.contact.email);
  const address = formatAddress(site.location);
  const maps = mapsHref(site.location);
  const social = socialLinks(site.social);
  const hours = formatOpeningHours(BOOKING_CONFIG.openingHours);

  return (
    <div className={`contact-details ${className}`.trim()}>
      {phone ? <a href={phone}>{site.contact.phone}</a> : null}
      {email ? <a href={email}>{site.contact.email}</a> : null}
      {address ? (maps ? <a href={maps} target="_blank" rel="noopener noreferrer">{address}</a> : <span>{address}</span>) : <span>{site.location.city}, {site.location.region}</span>}
      <ul className="contact-hours" aria-label="Opening hours">
        {hours.map((row) => <li key={row.days}><span>{row.days}</span> {row.hours}</li>)}
      </ul>
      {social.length > 0 ? (
        <ul className="contact-social" aria-label="Social media">
          {social.map((item) => (
            <li key={item.name}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.name}</a></li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
