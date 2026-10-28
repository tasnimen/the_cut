import { createBooking, listBookings } from "@/lib/booking/route-core";

export const dynamic = "force-dynamic";
export const GET = listBookings;
export const POST = createBooking;
