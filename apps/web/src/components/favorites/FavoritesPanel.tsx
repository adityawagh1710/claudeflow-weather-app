"use client";

/**
 * Favorites UI: add-current-location, list, reorder (up/down), remove, and
 * quick-switch. Accessible: semantic list, labelled buttons, keyboard usable.
 *
 * Mutations go through `useFavorites`, which hits the API (optimistic) when
 * signed in and persists to localStorage otherwise.
 */

import type { Favorite } from "@/lib/favorites";
import type { FavoritesApi } from "@/hooks/useFavorites";
import type { ActiveLocation } from "@/components/search/LocationSearch";

interface FavoritesPanelProps {
  api: FavoritesApi;
  active: ActiveLocation | null;
  onSelect: (loc: ActiveLocation) => void;
}

export function FavoritesPanel({ api, active, onSelect }: FavoritesPanelProps) {
  const { favorites, loading, error } = api;

  const canAdd =
    active !== null &&
    !favorites.some(
      (f) =>
        f.latitude === active.latitude && f.longitude === active.longitude,
    );

  const onQuickSwitch = (f: Favorite) => {
    onSelect({ name: f.name, latitude: f.latitude, longitude: f.longitude });
  };

  return (
    <section className="glass favorites" aria-labelledby="favorites-heading">
      <div className="favorites-header">
        <h2 id="favorites-heading" className="favorites-title">
          Saved locations
        </h2>
        <button
          type="button"
          className="btn"
          disabled={!canAdd}
          onClick={() =>
            active &&
            api.add({
              name: active.name,
              latitude: active.latitude,
              longitude: active.longitude,
            })
          }
        >
          + Add current
        </button>
      </div>

      {error && (
        <p className="muted" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <p className="muted" role="status">
          Loading favorites…
        </p>
      )}

      {!loading && favorites.length === 0 && (
        <p className="muted">No saved locations yet.</p>
      )}

      <ul className="favorites-list">
        {favorites.map((f, idx) => {
          const isActive =
            active?.latitude === f.latitude &&
            active?.longitude === f.longitude;
          return (
            <li key={f.id} className="favorites-item">
              <button
                type="button"
                className="favorites-switch"
                aria-current={isActive ? "true" : undefined}
                onClick={() => onQuickSwitch(f)}
              >
                {f.name}
                {f.country ? <span className="muted"> · {f.country}</span> : null}
              </button>
              <div className="favorites-actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Move ${f.name} up`}
                  disabled={idx === 0}
                  onClick={() => api.reorder(f.id, idx - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Move ${f.name} down`}
                  disabled={idx === favorites.length - 1}
                  onClick={() => api.reorder(f.id, idx + 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => api.remove(f.id)}
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
