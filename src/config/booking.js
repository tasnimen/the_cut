import { site } from "@/config/site";

const hours = (open, close) => Object.freeze({ open, close });

export const BOOKING_CONFIG = Object.freeze({
  timeZone: site.timeZone,
  currency: site.currency,
  locale: site.locale,
  slotMinutes: 15,
  cleanupBufferMinutes: 5,
  minimumLeadMinutes: 60,
  maximumAdvanceDays: 30,
  maximumServicesPerBooking: 3,
  maximumActiveBookingsPerUser: 2,
  cancellationCutoffHours: 24,
  lateArrivalGraceMinutes: 10,
  noShowReviewThreshold: 2,
  openingHours: Object.freeze({
    monday: hours("09:00", "19:00"),
    tuesday: hours("09:00", "19:00"),
    wednesday: hours("09:00", "19:00"),
    thursday: hours("09:00", "19:00"),
    friday: hours("09:00", "19:00"),
    saturday: hours("09:00", "17:00"),
    sunday: hours("10:00", "15:00"),
  }),
  holidays: Object.freeze({
    newYearsDay: true,
    independenceDay: true,
    thanksgiving: true,
    christmasDay: true,
    memorialDay: false,
    laborDay: false,
    december24EarlyClose: false,
    december24EarlyCloseAt: "14:00",
    // Add YYYY-MM-DD closure dates here until staff settings are implemented.
    additionalClosedDates: Object.freeze([]),
  }),
  tax: Object.freeze({
    servicesRate: 0,
    retailRate: 0.08875,
    retailRateNote: "Confirm New York City retail tax rates with an accountant before launch.",
  }),
  suggestedTips: Object.freeze([15, 20, 25]),
  depositEnabled: false,
  paymentLocation: "at_shop",
});

export const BOOKING_HOLIDAY_ASSUMPTIONS = Object.freeze([
  "Memorial Day, Labor Day, and the December 24 early close are disabled by default.",
  "When enabled, the December 24 early close is 2:00 PM local time; change the config if the shop chooses another time.",
  "Seeded barbers initially follow the shop's default opening hours with no lunch break or extra days off; replace schedules before accepting real bookings.",
]);
