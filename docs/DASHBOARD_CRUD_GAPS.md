# Dashboard CRUD gaps (audit of 2026-10-30)

Read-only audit of every dashboard screen that exists today. "Yes" means it works and is server-enforced. "No" is a gap.
"Hide/Show" is the existing active flag (a soft hide), not yet a real archive (no archived date or user, no Archived tab, no Restore).

| Screen | Create | Edit | Image upload | Image replace / remove | Archive (hide) | Hard delete | Status |
|---|---|---|---|---|---|---|---|
| Services (`/admin/services`) | Yes | Yes | **No** (card photo comes from a fixed image slot) | **No** | Hide/Show only (Turn on/off, no Archived tab, no Restore) | **No** | Active or off |
| Pricing packages (`/admin/packages`) | Yes (and "import defaults") | Yes | **No** | **No** | Hide/Show only | **No** | Active or off, featured flag |
| Barbers (`/admin/barbers`) | Yes | Yes (hours, breaks, days off, profile) | **No** (photo comes from an image slot named after the barber) | **No** | Hide/Show only; **no check for future bookings** when turned off | **No** | Bookable or off, on website or not |
| Holidays and closed dates (`/admin/settings`) | Yes (tick a holiday or type a date) | Yes | n/a | n/a | n/a | Delete = remove the line from the text box and save (no per-date button) | Saved or not |
| Gallery (`/admin/gallery`) | Yes (upload) | Yes (title, category, description) | Yes | **Replace: No** (delete and re-add). Remove: Yes | Hide/Show (equivalent to archive, no Restore tab) | Yes (with confirm; also deletes the Cloudinary file) | Shown or hidden |
| Products | **No screen, no data** (shop deferred) | - | - | - | - | - | - |
| Contact messages (`/admin/messages`) | n/a (visitors send them) | Status only | n/a | n/a | **No archive status** (New, Read, Replied) | Yes, for Admin **and** Super Admin (changed on 2026-10-30, see note) | New, Read, Replied |
| Bookings (`/admin/bookings`, `/all`) | Walk-in only (customers book online) | Status changes only (confirm, complete, no-show, cancel); admins cannot reschedule | n/a | n/a | n/a | No, by design (state machine) | Pending, Confirmed, Completed, Cancelled, No-show |
| Customers (`/admin/customers`) | n/a | No (read-only, limited fields) | n/a | n/a | n/a | No, by design (suspend and delete are Super Admin, unit I-23) | Read-only flags |
| Customer profile (`/user/profile`) | n/a | Name, password | Yes (avatar) | Yes | n/a | Deletion is a request only | n/a |

## Gaps that matter for the planned units

1. **Images (D1):** services, packages and barbers have no image field, no upload, replace or remove. Gallery and avatar have upload and remove but no replace-in-place for gallery.
2. **Archive and restore (D2):** nothing has `archivedAt` and `archivedBy`, an Archived tab or a Restore button. Hide/Show on services, packages, barbers and gallery is the closest thing.
3. **Reference checks (D2):** no hard delete exists for services, packages or barbers, so no "referenced by a booking" check exists yet. Services are referenced by booking snapshots, by barbers' service lists and by packages' booking service lists.
4. **Barber with future bookings (D2):** turning a barber off does not list or block future bookings.
5. **Contact messages:** the new brief says only Super Admin may delete ("unchanged"), but on 2026-10-30 the owner chose to let Admins delete too (`contactDeleteAll` is ADMIN and SUPER_ADMIN). One of the two has to win; D2 will follow the owner's answer. There is also no "archive" status yet.
6. **Holidays:** closed dates are one text box; adding and deleting works but is not a per-date button. Admins already have the permission.
7. **Products:** no model, screen or public page.
8. **Where rules get recorded:** the permission matrix lives in `docs/ROLE_PERMISSIONS.md` (there is no `docs/PERMISSIONS.md`), decisions in `docs/DECISIONS.md`.

## Update after unit D1 (2026-10-30)

Services, packages and barbers now have an optional picture: upload (drag and drop or file picker), crop to the card's fixed shape, preview, description (required), Replace and Remove, on both Create and Edit. Old pictures are deleted from Cloudinary after the new state is saved. Archive, restore and hard delete are still open (unit D2).

## Update after unit P1 (2026-10-30)

The question in gap 5 (who may delete contact messages) is now answered by the capability `messages.delete`, which the Super Admin will switch from the permission screen (P2). Until P2 it is on, as before. The same switches already cover gallery delete (`gallery.delete`) and hide (`gallery.hide`).

## D2a status (2026-10-31)
Archive and restore are built for services, packages and barbers (Active/Archived tabs, `archivedAt`/`archivedBy`, read-only archived records, barber block while upcoming bookings exist). Open: gallery photos and messages (D2b), Super Admin permanent delete (D2b), live verification.
