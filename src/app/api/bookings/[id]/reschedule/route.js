import { mutateBooking } from "@/lib/booking/route-core";

export const POST = (request, context) => mutateBooking(request, context, "reschedule");
