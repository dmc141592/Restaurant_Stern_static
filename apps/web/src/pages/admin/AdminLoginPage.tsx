import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { adminLoginSchema, type AdminLoginInput } from '@sternen/shared';
import { useAdminAuth } from '../../features/admin/AdminAuthContext.js';

export default function AdminLoginPage() {
  const { isAuthenticated, isLoading, login, isLoggingIn } = useAdminAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AdminLoginInput>({ resolver: zodResolver(adminLoginSchema) });

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const onSubmit = async (values: AdminLoginInput): Promise<void> => {
    try {
      await login(values.email, values.password);
      navigate('/admin');
    } catch {
      setError('password', { message: 'E-Mail-Adresse oder Passwort ist ungültig.' });
    }
  };

  return (
    <section aria-labelledby="admin-login-heading" style={{ maxWidth: 360, margin: '10vh auto' }}>
      <h1 id="admin-login-heading">Admin-Anmeldung</h1>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="email">E-Mail-Adresse</label>
          <input id="email" type="email" autoComplete="username" {...register('email')} />
          {errors.email && <p role="alert">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password">Passwort</label>
          <input id="password" type="password" autoComplete="current-password" {...register('password')} />
          {errors.password && <p role="alert">{errors.password.message}</p>}
        </div>
        <button type="submit" disabled={isLoggingIn}>
          {isLoggingIn ? 'Wird angemeldet…' : 'Anmelden'}
        </button>
      </form>
    </section>
  );
}
