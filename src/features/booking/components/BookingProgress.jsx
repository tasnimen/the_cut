const steps = ["Service", "Barber", "Date & Time", "Details", "Confirm"];

export function BookingProgress() {
  return (
    <ol className="booking-progress" aria-label="Booking steps">
      {steps.map((step, index) => (
        <li className={index === 0 ? "is-current" : ""} key={step}>
          <span aria-hidden="true">{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}
