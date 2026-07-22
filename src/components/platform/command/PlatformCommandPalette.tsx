import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Command,
  CornerDownLeft,
  Gauge,
  Loader2,
  LogOut,
  Plus,
  Scissors,
  Search,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  platformAdmin,
  type PlatformBarberiaSummary,
  type PlatformUsuario,
} from '../../../services/platformAdmin';

type PaletteMode = 'all' | 'users' | 'create-user';
type IndexStatus = 'idle' | 'loading' | 'ready' | 'error';

interface IndexedUser {
  user: PlatformUsuario;
  barberia: PlatformBarberiaSummary;
}

interface PaletteItem {
  id: string;
  label: string;
  description: string;
  group: string;
  icon: LucideIcon;
  keywords: string;
  shortcut?: string;
  perform: () => void;
}

interface PlatformCommandPaletteProps {
  onLogout: () => void | Promise<void>;
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL')
    .trim();
}

function matchesQuery(item: Pick<PaletteItem, 'label' | 'description' | 'keywords'>, query: string) {
  if (!query) return true;
  return normalizeSearch(`${item.label} ${item.description} ${item.keywords}`).includes(query);
}

async function indexTenantUsers(barberias: PlatformBarberiaSummary[]) {
  const users: IndexedUser[] = [];
  let failedTenants = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < barberias.length) {
      const barberia = barberias[cursor];
      cursor += 1;
      if (!barberia) continue;

      try {
        const detail = await platformAdmin.getBarberia(barberia.id);
        detail.usuarios.forEach((user) => users.push({ user, barberia }));
      } catch {
        failedTenants += 1;
      }
    }
  };

  const workerCount = Math.min(4, barberias.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  users.sort((left, right) =>
    left.user.nombre.localeCompare(right.user.nombre, 'es-CL', { sensitivity: 'base' }),
  );
  return { users, failedTenants };
}

function shortcutLabel(): string {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
}

function PlatformCommandPaletteComponent({ onLogout }: PlatformCommandPaletteProps) {
  const navigate = useNavigate();
  const dialogTitleId = useId();
  const listboxId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shopsLoadingRef = useRef(false);
  const usersLoadingRef = useRef(false);
  const shopsRequestSequenceRef = useRef(0);
  const usersRequestSequenceRef = useRef(0);
  const mountedRef = useRef(true);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PaletteMode>('all');
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [barberias, setBarberias] = useState<PlatformBarberiaSummary[]>([]);
  const [users, setUsers] = useState<IndexedUser[]>([]);
  const [shopsStatus, setShopsStatus] = useState<IndexStatus>('idle');
  const [usersStatus, setUsersStatus] = useState<IndexStatus>('idle');
  const [indexError, setIndexError] = useState<string | null>(null);
  const [failedTenants, setFailedTenants] = useState(0);
  const [keyboardShortcut] = useState(shortcutLabel);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      shopsRequestSequenceRef.current += 1;
      usersRequestSequenceRef.current += 1;
    };
  }, []);

  const loadShops = useCallback(async () => {
    if (shopsLoadingRef.current) return;
    shopsLoadingRef.current = true;
    const requestSequence = ++shopsRequestSequenceRef.current;
    usersRequestSequenceRef.current += 1;
    usersLoadingRef.current = false;
    setShopsStatus('loading');
    setUsersStatus('idle');
    setUsers([]);
    setIndexError(null);
    setFailedTenants(0);

    try {
      const nextBarberias = await platformAdmin.listBarberias();
      if (!mountedRef.current || requestSequence !== shopsRequestSequenceRef.current) return;
      setBarberias(nextBarberias);
      setShopsStatus('ready');
    } catch (error) {
      if (!mountedRef.current || requestSequence !== shopsRequestSequenceRef.current) return;
      setBarberias([]);
      setUsers([]);
      setShopsStatus('error');
      setUsersStatus('error');
      setIndexError(error instanceof Error ? error.message : 'No se pudo cargar el índice de Platform.');
    } finally {
      if (requestSequence === shopsRequestSequenceRef.current) shopsLoadingRef.current = false;
    }
  }, []);

  const loadUsers = useCallback(async (sourceBarberias: PlatformBarberiaSummary[]) => {
    if (usersLoadingRef.current) return;
    if (sourceBarberias.length === 0) {
      setUsers([]);
      setUsersStatus('ready');
      return;
    }

    usersLoadingRef.current = true;
    const requestSequence = ++usersRequestSequenceRef.current;
    setUsersStatus('loading');
    setFailedTenants(0);

    try {
      const indexed = await indexTenantUsers(sourceBarberias);
      if (!mountedRef.current || requestSequence !== usersRequestSequenceRef.current) return;
      setUsers(indexed.users);
      setFailedTenants(indexed.failedTenants);
      setUsersStatus(
        indexed.failedTenants === sourceBarberias.length ? 'error' : 'ready',
      );
    } catch {
      if (!mountedRef.current || requestSequence !== usersRequestSequenceRef.current) return;
      setUsers([]);
      setUsersStatus('error');
    } finally {
      if (requestSequence === usersRequestSequenceRef.current) usersLoadingRef.current = false;
    }
  }, []);

  const closePalette = useCallback(() => setOpen(false), []);
  const openPalette = useCallback(() => {
    setMode('all');
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
    void loadShops();
  }, [loadShops]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault();
        if (open) closePalette();
        else openPalette();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [closePalette, open, openPalette]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = requestAnimationFrame(() => inputRef.current?.focus());

    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePalette();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKeys);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleDialogKeys);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [closePalette, open]);

  const navigateTo = useCallback((to: string, state?: Record<string, unknown>) => {
    closePalette();
    navigate(to, state ? { state } : undefined);
  }, [closePalette, navigate]);

  const staticCommands = useMemo<PaletteItem[]>(
    () => [
      {
        id: 'mission-control',
        label: 'Mission Control',
        description: 'Abrir el centro de control de Platform',
        group: 'Commands',
        icon: Gauge,
        keywords: 'inicio dashboard control misión',
        perform: () => navigateTo('/platform'),
      },
      {
        id: 'barber-shops',
        label: 'Barber Shops',
        description: 'Abrir el directorio de barberías',
        group: 'Commands',
        icon: Building2,
        keywords: 'barberías tenants directorio shops',
        perform: () => navigateTo('/platform/barberias'),
      },
      {
        id: 'users',
        label: 'Users',
        description: 'Buscar usuarios existentes por tenant',
        group: 'Commands',
        icon: Users,
        keywords: 'usuarios administradores barberos people',
        perform: () => {
          setMode('users');
          setQuery('');
          setActiveIndex(0);
          requestAnimationFrame(() => inputRef.current?.focus());
        },
      },
      {
        id: 'create-barber-shop',
        label: 'Create Barber Shop',
        description: 'Crear un tenant con el formulario existente',
        group: 'Actions',
        icon: Plus,
        keywords: 'crear nueva barbería tenant shop',
        perform: () => navigateTo('/platform/barberias/nueva'),
      },
      {
        id: 'create-user',
        label: 'Create User',
        description: 'Elegir una barbería activa y crear sus credenciales',
        group: 'Actions',
        icon: UserPlus,
        keywords: 'crear usuario administrador barbero acceso password contraseña',
        perform: () => {
          setMode('create-user');
          setQuery('');
          setActiveIndex(0);
          requestAnimationFrame(() => inputRef.current?.focus());
        },
      },
      {
        id: 'logout',
        label: 'Logout',
        description: 'Cerrar la sesión segura de Platform',
        group: 'Session',
        icon: LogOut,
        keywords: 'cerrar sesión salir logout',
        perform: () => {
          closePalette();
          void onLogoutRef.current();
        },
      },
    ],
    [closePalette, navigateTo],
  );

  const normalizedQuery = normalizeSearch(query);

  useEffect(() => {
    const needsUsers = mode === 'users' || Boolean(normalizedQuery);
    if (!open || !needsUsers || shopsStatus !== 'ready' || usersStatus !== 'idle') return;
    void loadUsers(barberias);
  }, [barberias, loadUsers, mode, normalizedQuery, open, shopsStatus, usersStatus]);

  const paletteItems = useMemo<PaletteItem[]>(() => {
    const shopItems = barberias
      .filter((barberia) => {
        if (mode === 'create-user' && !barberia.activo) return false;
        if (!normalizedQuery) return true;
        return normalizeSearch(`${barberia.nombre} ${barberia.comuna} ${barberia.slug}`).includes(normalizedQuery);
      })
      .map<PaletteItem>((barberia) => ({
        id: `${mode === 'create-user' ? 'create-user-at' : 'shop'}-${barberia.id}`,
        label: barberia.nombre,
        description:
          mode === 'create-user'
            ? `${barberia.comuna} · Crear credenciales en este tenant`
            : `${barberia.comuna} · /${barberia.slug} · ${barberia.activo ? 'Activa' : 'Inactiva'}`,
        group: mode === 'create-user' ? 'Active Barber Shops' : 'Barber Shops',
        icon: mode === 'create-user' ? UserPlus : Building2,
        keywords: `${barberia.nombre} ${barberia.comuna} ${barberia.slug}`,
        perform: () =>
          mode === 'create-user'
            ? navigateTo(`/platform/barberias/${barberia.id}/usuarios`, { openCreateUser: true })
            : navigateTo(`/platform/barberias/${barberia.id}`),
      }));

    const userItems = users
      .filter(({ user, barberia }) => {
        if (!normalizedQuery) return true;
        return normalizeSearch(
          `${user.nombre} ${user.email} ${user.rol} ${user.slug ?? ''} ${barberia.nombre}`,
        ).includes(normalizedQuery);
      })
      .map<PaletteItem>(({ user, barberia }) => ({
        id: `user-${user.id}`,
        label: user.nombre,
        description: `${user.email} · ${barberia.nombre} · ${user.rol === 'admin' ? 'Administrador' : 'Barbero'}`,
        group: 'Users',
        icon: user.rol === 'barbero' ? Scissors : Users,
        keywords: `${user.nombre} ${user.email} ${user.rol} ${user.slug ?? ''} ${barberia.nombre}`,
        perform: () => navigateTo(`/platform/barberias/${barberia.id}/usuarios`),
      }));

    if (mode === 'users') return userItems;
    if (mode === 'create-user') return shopItems;
    if (!normalizedQuery) return staticCommands;

    return [
      ...staticCommands.filter((command) => matchesQuery(command, normalizedQuery)),
      ...shopItems,
      ...userItems,
    ];
  }, [barberias, mode, navigateTo, normalizedQuery, staticCommands, users]);

  useEffect(() => {
    itemRefs.current.length = paletteItems.length;
    setActiveIndex((current) =>
      paletteItems.length === 0 ? 0 : Math.min(current, paletteItems.length - 1),
    );
  }, [paletteItems.length]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleListNavigation = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (paletteItems.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % paletteItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + paletteItems.length) % paletteItems.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(paletteItems.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      paletteItems[activeIndex]?.perform();
    }
  };

  const showUsersLoading =
    (usersStatus === 'loading' || shopsStatus === 'loading') &&
    (mode === 'users' || Boolean(normalizedQuery));
  const showShopsLoading = shopsStatus === 'loading' && mode === 'create-user';
  const showNoResults =
    paletteItems.length === 0 &&
    !showUsersLoading &&
    !showShopsLoading &&
    shopsStatus !== 'error' &&
    !(usersStatus === 'error' && (mode === 'users' || Boolean(normalizedQuery)));

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="platform-command-trigger"
        onClick={openPalette}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Abrir Command Palette, ${keyboardShortcut}`}
      >
        <Search aria-hidden="true" />
        <span>Buscar</span>
        <kbd>{keyboardShortcut}</kbd>
      </button>

      {open && (
        <div
          className="platform-command-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePalette();
          }}
        >
          <div
            ref={dialogRef}
            className="platform-command-palette"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onKeyDown={handleListNavigation}
          >
            <div className="platform-command-palette__topline">
              <span id={dialogTitleId}><Command aria-hidden="true" /> Platform Command</span>
              <button type="button" onClick={closePalette} aria-label="Cerrar Command Palette">
                <X aria-hidden="true" /><kbd>Esc</kbd>
              </button>
            </div>

            {mode !== 'all' && (
              <div className="platform-command-palette__scope">
                <button
                  type="button"
                  onClick={() => {
                    setMode('all');
                    setQuery('');
                    setActiveIndex(0);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                >
                  <ArrowLeft aria-hidden="true" /> Todos los comandos
                </button>
                <span>{mode === 'users' ? 'Users' : 'Create User'}</span>
              </div>
            )}

            <div className="platform-command-search">
              <Search aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls={listboxId}
                aria-activedescendant={
                  paletteItems.length ? `${listboxId}-option-${activeIndex}` : undefined
                }
                placeholder={
                  mode === 'users'
                    ? 'Buscar por nombre, correo o barbería…'
                    : mode === 'create-user'
                      ? 'Buscar una barbería activa…'
                      : 'Buscar comandos, barberías o usuarios…'
                }
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setActiveIndex(0);
                    inputRef.current?.focus();
                  }}
                  aria-label="Limpiar búsqueda"
                >
                  <X aria-hidden="true" />
                </button>
              )}
            </div>

            <div
              className="platform-command-results"
              aria-busy={shopsStatus === 'loading' || usersStatus === 'loading'}
            >
              {shopsStatus === 'error' && (
                <div className="platform-command-state platform-command-state--error" role="alert">
                  <AlertCircle aria-hidden="true" />
                  <span>{indexError ?? 'No se pudo cargar el índice de Platform.'}</span>
                  <button type="button" onClick={() => void loadShops()}>Reintentar</button>
                </div>
              )}

              <div id={listboxId} className="platform-command-list" role="listbox" aria-label="Resultados de Command Palette">
                {paletteItems.map((item, index) => {
                  const previousGroup = paletteItems[index - 1]?.group;
                  const Icon = item.icon;
                  return (
                    <Fragment key={item.id}>
                      {item.group !== previousGroup && (
                        <div className="platform-command-group" role="presentation">{item.group}</div>
                      )}
                      <button
                        ref={(element) => {
                          itemRefs.current[index] = element;
                        }}
                        id={`${listboxId}-option-${index}`}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === index}
                        className={`platform-command-item${activeIndex === index ? ' is-active' : ''}`}
                        onMouseMove={() => setActiveIndex(index)}
                        onClick={item.perform}
                      >
                        <span className="platform-command-item__icon" aria-hidden="true"><Icon /></span>
                        <span className="platform-command-item__copy">
                          <strong>{item.label}</strong>
                          <small>{item.description}</small>
                        </span>
                        {item.shortcut ? <kbd>{item.shortcut}</kbd> : activeIndex === index ? <CornerDownLeft aria-hidden="true" /> : null}
                      </button>
                    </Fragment>
                  );
                })}
              </div>

              {(showUsersLoading || showShopsLoading) && (
                <div className="platform-command-state" role="status">
                  <Loader2 aria-hidden="true" />
                  <span>
                    {showShopsLoading ? 'Cargando barberías activas…' : 'Indexando usuarios existentes…'}
                  </span>
                </div>
              )}

              {failedTenants > 0 && usersStatus === 'ready' && (mode === 'users' || Boolean(normalizedQuery)) && (
                <div className="platform-command-state platform-command-state--warning" role="status">
                  <AlertCircle aria-hidden="true" />
                  <span>No se pudieron indexar los usuarios de {failedTenants} barberías.</span>
                </div>
              )}

              {usersStatus === 'error' && shopsStatus !== 'error' && (mode === 'users' || Boolean(normalizedQuery)) && (
                <div className="platform-command-state platform-command-state--error" role="alert">
                  <AlertCircle aria-hidden="true" />
                  <span>No se pudieron indexar los usuarios existentes.</span>
                  <button type="button" onClick={() => void loadUsers(barberias)}>Reintentar</button>
                </div>
              )}

              {showNoResults && (
                <div className="platform-command-empty">
                  <Search aria-hidden="true" />
                  <strong>Sin resultados</strong>
                  <span>
                    {mode === 'create-user' && !query
                      ? 'No hay barberías activas disponibles.'
                      : mode === 'users' && !query
                        ? 'No hay usuarios existentes para mostrar.'
                        : `No hay registros existentes que coincidan con “${query}”.`}
                  </span>
                </div>
              )}
            </div>

            <footer className="platform-command-footer">
              <span><kbd>↑</kbd><kbd>↓</kbd> Navegar</span>
              <span><kbd>↵</kbd> Seleccionar</span>
              <span><kbd>Esc</kbd> Cerrar</span>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

export const PlatformCommandPalette = memo(PlatformCommandPaletteComponent);
