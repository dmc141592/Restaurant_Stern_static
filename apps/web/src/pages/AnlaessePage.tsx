import { Link } from 'react-router-dom';

export default function AnlaessePage() {
  return (
    <section aria-labelledby="occasions-heading">
      <h1 id="occasions-heading">Anlässe</h1>
      <p>
        Platzhalterinhalt: Informationen zu privaten Anlässen, Bankette und Firmenevents im Restaurant
        Sternen Albisrieden folgen hier nach Abstimmung mit dem Restaurant.
      </p>
      <p>
        Für aktuelle öffentliche Veranstaltungen siehe die <Link to="/events">Events-Seite</Link>. Für
        Anfragen zu privaten Anlässen nutzen Sie unsere <Link to="/kontakt">Kontaktseite</Link>.
      </p>
    </section>
  );
}
