/**
 * @id imports
 * @name Imports
 * @description Resolve dependencies during consistency check.
 */

import javascript

from File f, TypeAliasDeclaration t
where(t.getIdentifier().toString() = "Model" or t.getIdentifier().toString() = "BookingID" or t.getIdentifier().toString() = "Booking" or t.getIdentifier().toString() = "Weekday" or t.getIdentifier().toString() = "TimeOfDay" or t.getIdentifier().toString() = "Time" or t.getIdentifier().toString() = "User" or t.getIdentifier().toString() = "BookingID" or t.getIdentifier().toString() = "Booking" or t.getIdentifier().toString() = "BookingFormData" or t.getIdentifier().toString() = "Model" or t.getIdentifier().toString() = "AddBooking" or t.getIdentifier().toString() = "CancelBooking" or t.getIdentifier().toString() = "ClearBookings" or t.getIdentifier().toString() = "Action") and t.getFile() = f
select t.getIdentifier().toString(), f.toString()