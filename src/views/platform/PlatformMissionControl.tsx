import {
  Activity,
  ArrowRight,
  Building2,
  CalendarClock,
  ExternalLink,
  Gauge,
  Layers3,
  Plus,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { AnimatedCounter, LoadingState } from '../../components/platform/polish';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useMountedRef } from '../../hooks/useMountedRef';
import { buildPublicBookingUrl } from '../../lib/slug';
import {
  PlatformAdminError,
  platformAdmin,
  type PlatformBarberiaSummary,
} from '../../services/platformAdmin';

const LazyStrands = lazy(() => import('../../components/platform/mission/Strands'));
const STRAND_COLORS = ['#f7c75a', '#63e6ff', '#a98bff'] as const;

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function errorMessage(error: unknown): string {
  return error instanceof PlatformAdminError || error instanceof Error
    ? error.message
    : 'No se pudo sincronizar Mission Control.';
}

function timestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatDate(value: string | null): string {
  const parsed = timestamp(value);
  return parsed === null ? 'Sin fecha registrada' : dateFormatter.format(new Date(parsed));
}

const MissionStrands = memo(function MissionStrands() {
  const reducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const handle = idleWindow.requestIdleCallback
      ? idleWindow.requestIdleCallback(() => setReady(true), { timeout: 700 })
      : window.setTimeout(() => setReady(true), 80);

    return () => {
      if (idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [reducedMotion]);

  if (reducedMotion || !ready) {
    return <div className="mission-strands-fallback" aria-hidden="true" />;
  }

  return (
    <Suspense fallback={<div className="mission-strands-fallback" aria-hidden="true" />}>
      <LazyStrands colors={STRAND_COLORS} />
    </Suspense>
  );
});

interface MissionMetricProps {
  label: string;
  value: number | null;
  detail: string;
  icon: typeof Building2;
  tone: 'gold' | 'cyan' | 'purple' | 'green';
}

const MissionMetric = memo(function MissionMetric({ label, value, detail, icon: Icon, tone }: MissionMetricProps) {
  return (
    <article className={`mission-metric mission-metric--${tone}`}>
      <div className="mission-metric__topline">
        <span className="mission-metric__icon" aria-hidden="true"><Icon /></span>
        <span className="mission-metric__signal">Dato actual</span>
      </div>
      <strong className={`mission-metric__value${value === null ? ' is-loading' : ''}`}>
        {value === null ? <span aria-label="Cargando">—</span> : <AnimatedCounter value={value} />}
      </strong>
      <span className="mission-metric__label">{label}</span>
      <span className="mission-metric__detail">{detail}</span>
    </article>
  );
});

export function PlatformMissionControl() {
  const { profile } = useAuth();
  const mountedRef = useMountedRef();
  const [barberias, setBarberias] = useState<PlatformBarberiaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const loadMissionData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await platformAdmin.listBarberias();
      if (!mountedRef.current) return;
      setBarberias(result);
      setLastSyncedAt(new Date());
    } catch (loadError) {
      if (!mountedRef.current) return;
      setError(errorMessage(loadError));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [mountedRef]);

  useEffect(() => {
    document.title = 'Mission Control | BarberSaaS';
    void loadMissionData();
  }, [loadMissionData]);

  const dataAvailable = !loading && !error;
  const metrics = useMemo(() => {
    const total = barberias.length;
    return {
      total,
      active: barberias.filter((barberia) => barberia.activo).length,
      users: barberias.reduce((sum, barberia) => sum + barberia.usuarios_count, 0),
      barbers: barberias.reduce((sum, barberia) => sum + barberia.barberos_count, 0),
      services: barberias.reduce((sum, barberia) => sum + barberia.servicios_count, 0),
    };
  }, [barberias]);

  const recentBarberias = useMemo(
    () =>
      [...barberias]
        .sort((left, right) => (timestamp(right.creado_en) ?? 0) - (timestamp(left.creado_en) ?? 0))
        .slice(0, 5),
    [barberias],
  );

  const recentActivity = useMemo(
    () =>
      barberias
        .map((barberia) => {
          const createdAt = timestamp(barberia.creado_en);
          const updatedAt = timestamp(barberia.actualizado_en);
          const hasLaterUpdate =
            updatedAt !== null && (createdAt === null || updatedAt > createdAt + 1_000);

          return {
            barberia,
            date: hasLaterUpdate ? barberia.actualizado_en : barberia.creado_en,
            time: hasLaterUpdate ? updatedAt : createdAt,
            label: hasLaterUpdate ? 'Actualización registrada' : 'Alta registrada',
          };
        })
        .filter((item) => item.time !== null)
        .sort((left, right) => (right.time ?? 0) - (left.time ?? 0))
        .slice(0, 5),
    [barberias],
  );

  const profileName = profile?.nombre?.trim() || 'Superadministrador';

  return (
    <div className="mission-control">
      <section className="mission-hero" aria-labelledby="mission-title">
        <MissionStrands />
        <div className="mission-hero__veil" aria-hidden="true" />

        <div className="mission-hero__content">
          <span className="mission-eyebrow">
            <Sparkles aria-hidden="true" /> Mission Control
          </span>
          <h1 id="mission-title">La plataforma completa, en una sola señal.</h1>
          <p>
            Hola, {profileName}. Supervisa la operación multi-tenant y entra directo a las
            acciones que mantienen BarberSaaS en movimiento.
          </p>

          <div className="mission-hero__actions">
            <Link to="/platform/barberias/nueva" className="mission-button mission-button--primary">
              <Plus aria-hidden="true" /> Nueva barbería
            </Link>
            <Link to="/platform/barberias" className="mission-button mission-button--glass">
              Ver directorio <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>

        <aside className="mission-hero__telemetry" aria-live="polite">
          <div className="mission-telemetry__head">
            <span>Telemetría</span>
            <Activity aria-hidden="true" />
          </div>
          <div className="mission-telemetry__status">
            <span className={error ? 'is-error' : loading ? 'is-loading' : 'is-ready'} />
            <strong>{error ? 'Sin conexión de datos' : loading ? 'Sincronizando' : 'Datos conectados'}</strong>
          </div>
          <p>
            {dataAvailable
              ? `${metrics.active} de ${metrics.total} barberías activas`
              : error ?? 'Consultando la administración de plataforma…'}
          </p>
          <span className="mission-telemetry__time">
            {lastSyncedAt ? `Lectura: ${dateFormatter.format(lastSyncedAt)}` : 'Esperando primera lectura'}
          </span>
        </aside>
      </section>

      {error && (
        <div className="mission-alert" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadMissionData()} disabled={loading}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </button>
        </div>
      )}

      <section className="mission-section" aria-labelledby="quick-actions-title">
        <div className="mission-section__heading">
          <div>
            <span className="mission-section__kicker">Acceso inmediato</span>
            <h2 id="quick-actions-title">Acciones rápidas</h2>
          </div>
          <span className="mission-section__index">01</span>
        </div>

        <div className="mission-quick-grid">
          <Link to="/platform/barberias/nueva" className="mission-quick-card mission-quick-card--gold">
            <span className="mission-quick-card__icon"><Plus aria-hidden="true" /></span>
            <span>
              <strong>Crear barbería</strong>
              <small>Da de alta un nuevo tenant.</small>
            </span>
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link to="/platform/barberias" className="mission-quick-card mission-quick-card--cyan">
            <span className="mission-quick-card__icon"><Building2 aria-hidden="true" /></span>
            <span>
              <strong>Administrar tenants</strong>
              <small>Revisa accesos, estado y catálogo.</small>
            </span>
            <ArrowRight aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="mission-quick-card mission-quick-card--purple"
            onClick={() => void loadMissionData()}
            disabled={loading}
          >
            <span className="mission-quick-card__icon"><RefreshCw aria-hidden="true" /></span>
            <span>
              <strong>{loading ? 'Sincronizando…' : 'Actualizar datos'}</strong>
              <small>Solicita una nueva lectura a Supabase.</small>
            </span>
            <Activity aria-hidden="true" />
          </button>
        </div>
      </section>

      <section id="platform-metrics" className="mission-section" aria-labelledby="metrics-title">
        <div className="mission-section__heading">
          <div>
            <span className="mission-section__kicker">Estado real</span>
            <h2 id="metrics-title">Métricas de plataforma</h2>
          </div>
          <span className="mission-section__index">02</span>
        </div>

        <div className="mission-metrics-grid" aria-busy={loading}>
          <MissionMetric
            label="Barberías"
            value={dataAvailable ? metrics.total : null}
            detail="Tenants registrados"
            icon={Building2}
            tone="gold"
          />
          <MissionMetric
            label="Activas"
            value={dataAvailable ? metrics.active : null}
            detail="Tenants con acceso habilitado"
            icon={ShieldCheck}
            tone="green"
          />
          <MissionMetric
            label="Usuarios"
            value={dataAvailable ? metrics.users : null}
            detail={`${dataAvailable ? metrics.barbers : '—'} con rol barbero`}
            icon={Users}
            tone="cyan"
          />
          <MissionMetric
            label="Servicios"
            value={dataAvailable ? metrics.services : null}
            detail="Servicios configurados"
            icon={Layers3}
            tone="purple"
          />
        </div>
      </section>

      <div className="mission-split-grid">
        <section id="recent-activity" className="mission-panel" aria-labelledby="activity-title">
          <div className="mission-panel__heading">
            <div>
              <span className="mission-section__kicker">Últimos registros</span>
              <h2 id="activity-title">Actividad reciente</h2>
            </div>
            <CalendarClock aria-hidden="true" />
          </div>

          <div className="mission-activity-list" aria-busy={loading}>
            {loading ? (
              <LoadingState label="Sincronizando actividad" compact />
            ) : recentActivity.length === 0 ? (
              <div className="mission-empty">No hay actividad fechada para mostrar.</div>
            ) : (
              recentActivity.map(({ barberia, date, label }) => (
                <Link
                  key={`${barberia.id}-${date ?? 'undated'}`}
                  to={`/platform/barberias/${barberia.id}`}
                  className="mission-activity-item"
                >
                  <span className="mission-activity-item__rail" aria-hidden="true" />
                  <span className="mission-activity-item__copy">
                    <strong>{barberia.nombre}</strong>
                    <small>{label} · {barberia.comuna}</small>
                  </span>
                  <time dateTime={date ?? undefined}>{formatDate(date)}</time>
                </Link>
              ))
            )}
          </div>
        </section>

        <section id="platform-shortcuts" className="mission-panel" aria-labelledby="shortcuts-title">
          <div className="mission-panel__heading">
            <div>
              <span className="mission-section__kicker">Navegación</span>
              <h2 id="shortcuts-title">Atajos de plataforma</h2>
            </div>
            <Gauge aria-hidden="true" />
          </div>

          <div className="mission-shortcuts">
            <Link to="/platform/barberias">
              <Building2 aria-hidden="true" />
              <span><strong>Directorio de tenants</strong><small>Administrar barberías</small></span>
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link to="/platform/barberias/nueva">
              <Plus aria-hidden="true" />
              <span><strong>Nuevo tenant</strong><small>Iniciar configuración</small></span>
              <ArrowRight aria-hidden="true" />
            </Link>
            <a href="#platform-metrics">
              <Activity aria-hidden="true" />
              <span><strong>Métricas</strong><small>Volver al estado global</small></span>
              <ArrowRight aria-hidden="true" />
            </a>
            <a href="#recent-barberias">
              <Scissors aria-hidden="true" />
              <span><strong>Altas recientes</strong><small>Revisar últimas barberías</small></span>
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>

      <section id="recent-barberias" className="mission-section" aria-labelledby="recent-title">
        <div className="mission-section__heading mission-section__heading--linked">
          <div>
            <span className="mission-section__kicker">Directorio</span>
            <h2 id="recent-title">Barberías recientes</h2>
          </div>
          <Link to="/platform/barberias">Ver todas <ArrowRight aria-hidden="true" /></Link>
        </div>

        <div className="mission-barberias-grid" aria-busy={loading}>
          {loading ? (
            <LoadingState label="Cargando barberías recientes" />
          ) : recentBarberias.length === 0 ? (
            <div className="mission-empty mission-empty--wide">
              Aún no hay barberías. Crea el primer tenant para iniciar la operación.
            </div>
          ) : (
            recentBarberias.map((barberia) => (
              <article key={barberia.id} className="mission-barberia-card">
                <div className="mission-barberia-card__topline">
                  <span className="mission-barberia-card__mark"><Scissors aria-hidden="true" /></span>
                  <span className={`mission-status${barberia.activo ? ' is-active' : ''}`}>
                    {barberia.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <div>
                  <h3>{barberia.nombre}</h3>
                  <p>{barberia.comuna} · /{barberia.slug}</p>
                </div>
                <dl>
                  <div><dt>Usuarios</dt><dd>{barberia.usuarios_count}</dd></div>
                  <div><dt>Barberos</dt><dd>{barberia.barberos_count}</dd></div>
                  <div><dt>Servicios</dt><dd>{barberia.servicios_count}</dd></div>
                </dl>
                <div className="mission-barberia-card__footer">
                  <time dateTime={barberia.creado_en ?? undefined}>{formatDate(barberia.creado_en)}</time>
                  <span>
                    <a
                      href={buildPublicBookingUrl(barberia.slug)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir portal público de ${barberia.nombre}`}
                    >
                      <ExternalLink aria-hidden="true" />
                    </a>
                    <Link to={`/platform/barberias/${barberia.id}`} aria-label={`Ver ${barberia.nombre}`}>
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
