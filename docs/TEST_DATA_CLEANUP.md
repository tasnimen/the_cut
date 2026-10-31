# Test data cleanup (Stage A QA audit, 2026-10-31)

Every record the QA audit created is listed here. Rule: removed through the app where the app allows it; otherwise left in the safest state (cancelled or archived) and listed for a manual Atlas removal. Dev database: `the_cut`. Nothing here was created outside the dev database.

## Created by the audit
| Record | Where | State now | How it can be removed |
|---|---|---|---|
| Booking "Test QA Walkin A" (walk-in, Beard Trim, Daniel Carter, 2026-10-31 9:30 AM) | `booking`, field `customerName`; its `bookingSlot` rows were released on cancel | Cancelled | The app never deletes bookings. Atlas: delete the `booking` document with `customerName: "Test QA Walkin A"` (status cancelled) |
| Service "Test QA Service" (`test-qa-service`) | `service`, field `slug` | Archived, picture removed | Dashboard: already archived. Permanent delete comes with D2b; Atlas: delete the document with `slug: "test-qa-service"` |
| Package "Test QA Package" (`test-qa-package`) | `pricingPackage`, field `slug` | Archived | Same: Atlas delete where `slug: "test-qa-package"` |
| Barber "Test QA Barber" (`test-qa-barber`) | `barber`, field `slug` | Archived (hidden, no hours) | Same: Atlas delete where `slug: "test-qa-barber"` |
| Gallery photo "Test QA Photo" | `galleryItem` and `media` | Deleted through the app (file removed from Cloudinary) | Done |
| Service picture uploads (2) | `media` (category services) | The app deleted the replaced and the removed picture after saving; leftover check in the QA report | Check `media` for `category: "services"` documents with `attachedTo: null` |
| Customer bookings made by the owner-created test account (Beard Trim: 2026-10-31 4:00 PM with wfoijwfnwfe, cancelled by the Admin; 2026-11-10 and 2026-11-11 cancelled by the customer; one Nov 9 booking rescheduled then cancelled) | `booking`, field `customerName` "Ahmed Tasnim" | All cancelled | Atlas: delete those `booking` documents (status cancelled), if wanted |
| Test customer account (email `test+qa1@example.com`) | `user`, field `email` | Active (role USER) | The owner can use "Request account deletion" on the profile page; Atlas: delete the `user` document and its `session` and `account` rows |
| Closed date 2027-12-30 | `siteSetting` (holidays) | Added and removed again; setting unchanged | Done |

## Found, created earlier by the owner (not by the audit)
| Record | Note |
|---|---|
| Barber `kjwfwoifwl` ("wfoijwfnwfe") | Test barber; it is the only barber the public booking page offers, so real visitors could book it |
| Package `jjjjj` ("cut") | Hidden test package |
| Gallery photos "Best Haircut" and "Smart haircut" | Their screen-reader description is the upload form's hint sentence |
| Bookings "Dummy I8 Customer", "Tasnim" (3), "Test Walkin" | Earlier test bookings (cancelled or confirmed); the confirmed ones for Daniel Carter block archiving him |

The audit also tried a contact message: none was received (0 in `contactMessage`), so no message record exists.

The audit made no changes to permissions, services, barbers or settings other than the test records above.
