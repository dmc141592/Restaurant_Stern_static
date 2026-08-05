import { useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { createReservationSchema, type CreateReservationInput } from '@sternen/shared';
import { ApiError } from '../../api/client.js';
import { createReservation } from '../../api/public.js';
import { useAvailability } from './hooks/useAvailability.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import styles from './ReservationForm.module.css';

interface AreaOption {
  areaId: string;
  areaName: string;
  availableCapacity: number;
}

function generateIdempotencyKey(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ReservationForm() {
  const navigate = useNavigate();
  const idempotencyKeyRef = useRef(generateIdempotencyKey());
  const [conflictAlternatives, setConflictAlternatives] = useState<AreaOption[] | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateReservationInput>({
    resolver: zodResolver(createReservationSchema),
    defaultValues: {
      partySize: 2,
      localDate: '',
      localTime: '',
      guestFirstName: '',
      guestLastName: '',
      guestEmail: '',
      guestPhone: '',
      guestNotes: '',
      privacyAccepted: false as unknown as true,
    },
  });

  const partySize = watch('partySize');
  const localDate = watch('localDate');
  const localTime = watch('localTime');
  const preferredAreaId = watch('preferredAreaId');

  const debouncedParams = useDebouncedValue({ date: localDate, time: localTime, partySize }, 400);
  const availability = useAvailability(debouncedParams);

  const areaOptions = useMemo<AreaOption[]>(() => {
    if (!availability.data) {
      return [];
    }
    const options: AreaOption[] = [];
    if (availability.data.recommendation) {
      options.push(availability.data.recommendation);
    }
    options.push(...availability.data.alternatives);
    return options;
  }, [availability.data]);

  const recommendedAreaId = availability.data?.recommendation?.areaId;

  useEffect(() => {
    if (recommendedAreaId && !preferredAreaId) {
      setValue('preferredAreaId', recommendedAreaId, { shouldValidate: false });
    }
  }, [recommendedAreaId, preferredAreaId, setValue]);

  const onSubmit = async (values: CreateReservationInput): Promise<void> => {
    setSubmitError(null);
    setConflictAlternatives(null);
    setIsSubmitting(true);
    try {
      const response = await createReservation(
        { ...values, guestNotes: values.guestNotes || undefined },
        idempotencyKeyRef.current,
      );
      navigate('/reservation/erfolgreich', { state: { result: response } });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AVAILABILITY_CONFLICT') {
        setSubmitError(error.message);
        const alternatives = error.details?.alternatives;
        if (Array.isArray(alternatives)) {
          setConflictAlternatives(alternatives as AreaOption[]);
        }
        idempotencyKeyRef.current = generateIdempotencyKey();
      } else if (error instanceof ApiError) {
        setSubmitError(error.message);
        idempotencyKeyRef.current = generateIdempotencyKey();
      } else {
        setSubmitError('Ein unerwarteter Fehler ist aufgetreten. Bitte später erneut versuchen.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <fieldset className={styles.fieldGroup}>
        <legend>Wunschzeit</legend>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="partySize">Personenzahl</label>
            <input
              id="partySize"
              type="number"
              min={1}
              max={1000}
              {...register('partySize', { valueAsNumber: true })}
            />
            {errors.partySize && (
              <p className={styles.errorText} role="alert">
                {errors.partySize.message}
              </p>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor="localDate">Datum</label>
            <input id="localDate" type="date" {...register('localDate')} />
            {errors.localDate && (
              <p className={styles.errorText} role="alert">
                {errors.localDate.message}
              </p>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor="localTime">Uhrzeit</label>
            <input id="localTime" type="time" step={60} {...register('localTime')} />
            {errors.localTime && (
              <p className={styles.errorText} role="alert">
                {errors.localTime.message}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.fieldGroup}>
        <legend>Bereich</legend>
        {availability.isFetching && <p>Verfügbarkeit wird geprüft…</p>}
        {!availability.isFetching && areaOptions.length === 0 && localDate && localTime && (
          <p>
            Für die gewünschte Zeit ist aktuell keine Kapazität verfügbar. Bitte andere Zeit wählen.
          </p>
        )}
        {areaOptions.length > 0 && (
          <div className={styles.areaOptions} role="radiogroup" aria-label="Bereich auswählen">
            {areaOptions.map((option) => (
              <label key={option.areaId} className={styles.areaOption}>
                <input
                  type="radio"
                  value={option.areaId}
                  checked={preferredAreaId === option.areaId}
                  onChange={() => setValue('preferredAreaId', option.areaId)}
                />
                {option.areaName}
                {option.areaId === recommendedAreaId ? ' (empfohlen)' : ''} — freie Kapazität:{' '}
                {option.availableCapacity}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className={styles.fieldGroup}>
        <legend>Ihre Kontaktdaten</legend>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="guestFirstName">Vorname</label>
            <input
              id="guestFirstName"
              type="text"
              autoComplete="given-name"
              {...register('guestFirstName')}
            />
            {errors.guestFirstName && (
              <p className={styles.errorText} role="alert">
                {errors.guestFirstName.message}
              </p>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor="guestLastName">Nachname</label>
            <input
              id="guestLastName"
              type="text"
              autoComplete="family-name"
              {...register('guestLastName')}
            />
            {errors.guestLastName && (
              <p className={styles.errorText} role="alert">
                {errors.guestLastName.message}
              </p>
            )}
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="guestEmail">E-Mail-Adresse</label>
            <input id="guestEmail" type="email" autoComplete="email" {...register('guestEmail')} />
            {errors.guestEmail && (
              <p className={styles.errorText} role="alert">
                {errors.guestEmail.message}
              </p>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor="guestPhone">Telefonnummer</label>
            <input id="guestPhone" type="tel" autoComplete="tel" {...register('guestPhone')} />
            {errors.guestPhone && (
              <p className={styles.errorText} role="alert">
                {errors.guestPhone.message}
              </p>
            )}
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="guestNotes">Bemerkung (optional)</label>
          <textarea id="guestNotes" rows={3} {...register('guestNotes')} />
          {errors.guestNotes && (
            <p className={styles.errorText} role="alert">
              {errors.guestNotes.message}
            </p>
          )}
        </div>
      </fieldset>

      <div className={styles.summary} aria-live="polite">
        <h2>Zusammenfassung</h2>
        <p>
          {partySize || '–'} Personen am {localDate || '–'} um {localTime || '–'} Uhr
          {preferredAreaId
            ? ` im Bereich ${areaOptions.find((option) => option.areaId === preferredAreaId)?.areaName ?? ''}`
            : ''}
          .
        </p>
      </div>

      <div className={styles.field}>
        <label>
          <input type="checkbox" {...register('privacyAccepted')} /> Ich akzeptiere die
          Datenschutzbestimmungen.
        </label>
        {errors.privacyAccepted && (
          <p className={styles.errorText} role="alert">
            {errors.privacyAccepted.message}
          </p>
        )}
      </div>

      {submitError && (
        <div className={styles.conflictBox} role="alert">
          <p>{submitError}</p>
          {conflictAlternatives && conflictAlternatives.length > 0 && (
            <ul>
              {conflictAlternatives.map((option) => (
                <li key={option.areaId}>
                  {option.areaName} — freie Kapazität: {option.availableCapacity}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? 'Wird gesendet…' : 'Reservation absenden'}
      </button>
    </form>
  );
}
