import ReservationForm from '../features/reservations/ReservationForm.js';

export default function ReservationPage() {
  return (
    <section aria-labelledby="reservation-heading">
      <h1 id="reservation-heading">Tisch reservieren</h1>
      <p>
        Bitte füllen Sie das folgende Formular aus. Nach dem Absenden prüfen wir Ihre Anfrage und
        senden Ihnen eine Bestätigung per E-Mail.
      </p>
      <ReservationForm />
    </section>
  );
}
