/** All fields are pre-formatted, localized strings — templates do no date/zone math. */
export interface ReservationSummaryFields {
  publicReference: string;
  statusLabel: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  localDateLabel: string;
  startTimeLabel: string;
  endTimeLabel: string;
  partySize: number;
  areaName: string;
  requestedAreaName: string | null;
  guestNotes: string | null;
}

export interface RestaurantNewReservationData extends ReservationSummaryFields {
  receivedAtLabel: string;
  confirmUrl: string;
  rejectUrl: string;
}

export type GuestRequestReceivedData = ReservationSummaryFields;
export type GuestReservationConfirmedData = ReservationSummaryFields & {
  restaurantAddress: string;
  restaurantPhone: string;
};
export type GuestReservationRejectedData = ReservationSummaryFields & {
  rejectionReason: string | null;
};
export type GuestReservationCancelledData = ReservationSummaryFields;
