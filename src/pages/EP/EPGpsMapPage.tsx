// ═══════════════════════════════════════════════════════════════
// EPGpsMapPage — "EP's GPS Location" map view
//
// Renders a Leaflet map with one pointer per EP that has GPS
// coordinates. Each pointer is labelled with the EP's HH ID; clicking
// a pointer opens a popup with the affected person's details and a
// link to the full EP record.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { PageLayout } from '../../components/PageLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { EmptyState } from '../../components/EmptyState';
import { useProject } from '../../contexts/ProjectContext';
import { getMapSurveys, type GpsSurveyPoint } from '../../api/map';

// Fix Leaflet marker images when bundled (webpack/vite resolve to hashed URLs).
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Whole-country default viewport (Bangladesh).
const DEFAULT_BBOX = '88.0,20.5,92.7,26.7';
const DEFAULT_CENTER: [number, number] = [23.685, 90.3563];
const DEFAULT_ZOOM = 8;

const STATUS_OPTIONS = ['', 'DRAFT', 'SUBMITTED', 'VERIFIED', 'APPROVED'];

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusColor(status: string | null): string {
  switch ((status ?? '').toUpperCase()) {
    case 'APPROVED':
      return '#059669';
    case 'VERIFIED':
      return '#0891b2';
    case 'SUBMITTED':
      return '#2563eb';
    case 'DRAFT':
      return '#64748b';
    default:
      return '#6b7280';
  }
}

function initials(name: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0] ?? '')[0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function buildPopup(point: GpsSurveyPoint): string {
  const name = point.name ?? 'EP';
  const hh = point.hh_id || point.ep_id || '—';
  const location = [point.district, point.upazila].filter(Boolean).join(', ');
  const coords =
    point.gps_latitude && point.gps_longitude
      ? `${point.gps_latitude}, ${point.gps_longitude}`
      : '—';

  const rows: [string, string][] = [
    ["Father's name", point.father_name ?? '—'],
    ['NID', point.nid_number ?? '—'],
    ['Mobile', point.mobile ?? '—'],
    ['Location', location || '—'],
    ['GPS Source', point.location_source ?? '—'],
    ['Coordinates', coords],
  ];

  const body = rows
    .map(
      ([label, value]) =>
        `<div class="gps-popup-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`,
    )
    .join('');

  return `
    <div class="gps-popup">
      <div class="gps-popup-head">
        <div class="gps-popup-avatar">${escapeHtml(initials(name))}</div>
        <div class="gps-popup-title">
          <div class="gps-popup-name">${escapeHtml(name)}</div>
          <div class="gps-popup-meta">EP ${escapeHtml(point.ep_id ?? '—')} &nbsp;&bull;&nbsp; HH ${escapeHtml(hh)}</div>
        </div>
        <span class="gps-popup-status" style="background:${statusColor(point.status)}">${escapeHtml(point.status ?? '—')}</span>
      </div>
      <div class="gps-popup-body">${body}</div>
      <a class="gps-popup-link" href="/ep/${encodeURIComponent(point.affected_person_id)}">View full EP details →</a>
    </div>
  `;
}

function markerIconFor(point: GpsSurveyPoint): L.DivIcon {
  const label = escapeHtml(point.hh_id || point.ep_id || point.affected_person_id);
  return L.divIcon({
    className: 'gps-marker-wrap',
    html: `<div class="gps-pin"><span class="gps-pin-label">${label}</span></div>`,
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -36],
  });
}

export function EPGpsMapPage() {
  const { project } = useProject();
  const projectId = project?.project_id;
  const navigate = useNavigate();

  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const requestSeqRef = useRef(0);
  const lastBboxRef = useRef('');
  const hasFittedRef = useRef(false);

  const [points, setPoints] = useState<GpsSurveyPoint[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch survey points for the current bbox ────────────────
  async function loadSurveys(bbox: string) {
    // Skip re-fetching when the viewport hasn't actually changed.
    // This prevents the setView → moveend → fetch feedback loop.
    if (bbox === lastBboxRef.current) return;
    lastBboxRef.current = bbox;

    const requestId = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getMapSurveys({
        bbox,
        project_id: projectId,
        status: status || undefined,
      });
      if (requestId !== requestSeqRef.current) return;
      setPoints(data);
      renderMarkers(data);
    } catch (err) {
      if (requestId !== requestSeqRef.current) return;
      setPoints([]);
      renderMarkers([]);
      setError(err instanceof Error ? err.message : 'Failed to load GPS locations.');
    } finally {
      if (requestId === requestSeqRef.current) setLoading(false);
    }
  }

  // ── Re-render markers layer from a dataset ──────────────────
  function renderMarkers(data: GpsSurveyPoint[]) {
    const group = markersRef.current;
    if (!group) return;

    // Fit the view once, on the first data load only. Re-fitting after
    // every refresh yanks the view around and re-fires moveend.
    const firstRender = !hasFittedRef.current;

    group.clearLayers();

    for (const point of data) {
      const lat = Number(point.gps_latitude);
      const lng = Number(point.gps_longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const marker = L.marker([lat, lng], { icon: markerIconFor(point) });
      marker.bindPopup(buildPopup(point), {
        maxWidth: 330,
        minWidth: 280,
        autoPanPadding: L.point(40, 40),
        className: 'gps-popup-card',
      });
      marker.bindTooltip(`HH ID: ${escapeHtml(point.hh_id || point.ep_id)}`, {
        direction: 'top',
        offset: L.point(0, -34),
      });
      // Route the popup "View EP details" link through the SPA router.
      marker.on('popupopen', () => {
        const link = marker.getPopup()?.getElement()?.querySelector<HTMLAnchorElement>('.gps-popup-action a');
        if (link) {
          link.onclick = (e) => {
            e.preventDefault();
            navigate(`/ep/${point.affected_person_id}`);
          };
        }
      });
      group.addLayer(marker);
    }

    if (firstRender) {
      hasFittedRef.current = true;
      fitToData(data);
    }
  }

  function fitToData(data: GpsSurveyPoint[]) {
    const map = leafletRef.current;
    if (!map) return;
    const valid = data
      .map((p) => [Number(p.gps_latitude), Number(p.gps_longitude)] as L.LatLngTuple)
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    if (valid.length === 1 && valid[0]) {
      map.setView(valid[0], 15);
    } else if (valid.length > 1) {
      map.fitBounds(L.latLngBounds(valid), { padding: [40, 40], maxZoom: 16 });
    }
  }

  // ── Initialise the Leaflet map once ─────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    const map = L.map(mapRef.current, { zoomControl: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    leafletRef.current = map;

    // Re-query when the visible viewport changes.
    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    const onMove = () => {
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => {
        const b = map.getBounds();
        const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(',');
        void loadSurveys(bbox);
      }, 350);
    };

    map.on('moveend', onMove);

    // Initial load for the whole country.
    void loadSurveys(DEFAULT_BBOX);

    return () => {
      clearTimeout(moveTimer);
      map.off('moveend', onMove);
      // Invalidate any in-flight request and reset refetch guards so a
      // remount (e.g. React StrictMode) always performs a fresh load.
      requestSeqRef.current++;
      lastBboxRef.current = '';
      hasFittedRef.current = false;
      map.remove();
      leafletRef.current = null;
      markersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reload when the project or status filter changes ────────
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;
    const b = map.getBounds();
    const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(',');
    void loadSurveys(bbox);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, status]);

  const totalPinned = useMemo(() => points.length, [points]);

  return (
    <PageLayout
      title="EP's GPS Location"
      subtitle={
        <>
          Interactive map of affected persons with recorded GPS coordinates. Pointers are
          labelled with the HH ID — click a pointer to view that EP's information.
        </>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s ? s : 'All statuses'}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const map = leafletRef.current;
              const b = map?.getBounds();
              const bbox = b ? [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(',') : DEFAULT_BBOX;
              void loadSurveys(bbox);
            }}
            className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
      }
    >
      {error && <ErrorDisplay message={error} />}

      {loading && points.length === 0 && (
        <LoadingSpinner message="Loading GPS locations..." />
      )}

      {!loading && !error && points.length === 0 && (
        <EmptyState
          title="No GPS locations found"
          message="No affected persons in the current view have recorded GPS coordinates. Pan/zoom the map or clear the status filter."
        />
      )}

      {!loading && points.length > 0 && (
        <p className="text-sm text-gray-500">
          {totalPinned} EP{totalPinned !== 1 ? 's' : ''} pinned in the current view
        </p>
      )}

      <div className="relative overflow-hidden rounded-lg border border-gray-200">
        {loading && points.length > 0 && (
          <div className="pointer-events-none absolute right-3 top-3 z-[1000] rounded-md bg-white/90 px-3 py-1 text-xs font-medium text-gray-600 shadow">
            Refreshing…
          </div>
        )}
        <div ref={mapRef} className="h-[62vh] min-h-[480px] w-full" />
      </div>
    </PageLayout>
  );
}