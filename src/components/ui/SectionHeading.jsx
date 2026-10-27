export function SectionHeading({
  eyebrow,
  children,
  id,
  aside,
  className = "",
}) {
  return (
    <div className={`section-heading ${className}`.trim()}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id}>{children}</h2>
      </div>
      {aside ? <div className="section-heading-aside">{aside}</div> : null}
    </div>
  );
}
