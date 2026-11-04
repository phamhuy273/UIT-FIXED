import { useId } from 'react';
import type { BuildingOption, LocationSelection } from '../types/master-data.types';
import { getLocationOptions, selectBuilding, selectFloor } from '../utils/location-selection';

export interface LocationCascadeProps {
  buildings: BuildingOption[];
  value: LocationSelection;
  onChange: (value: LocationSelection) => void;
  loading?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  namePrefix?: string;
}

export function LocationCascade({
  buildings,
  value,
  onChange,
  loading = false,
  loadError = false,
  onRetry,
  disabled = false,
  required = false,
  error,
  namePrefix = 'location',
}: LocationCascadeProps) {
  const id = useId();
  const { building, floor, locations } = getLocationOptions(buildings, value);
  const blocked = disabled || loading || loadError;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = error ? `${helperId} ${errorId}` : helperId;
  const hasDirectAreas = Boolean(building?.locations.length);

  return (
    <div className="location-selector" style={{ display: 'grid', gap: '16px', minWidth: 0 }}>
      <fieldset
        style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: '16px', minWidth: 0 }}
        disabled={blocked}
        aria-busy={loading}
      >
        <legend className="sr-only">Chọn vị trí xảy ra sự cố</legend>

        {/* Row 1: Tòa nhà & Tầng (2 columns) */}
        <div className="field-row">
          <div className="field">
            <label className="field__label" htmlFor={`${id}-building`}>
              Tòa nhà{required && <span className="req">*</span>}
            </label>
            <select
              id={`${id}-building`}
              name={`${namePrefix}.buildingId`}
              className="select"
              value={building?.id ?? ''}
              required={required}
              aria-describedby={describedBy}
              aria-invalid={Boolean(error)}
              onChange={(event) =>
                onChange(selectBuilding(event.target.value ? Number(event.target.value) : null))
              }
            >
              <option value="">{loading ? 'Đang tải tòa nhà…' : 'Chọn tòa nhà'}</option>
              {buildings.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor={`${id}-floor`}>
              Tầng
            </label>
            <select
              id={`${id}-floor`}
              name={`${namePrefix}.floorId`}
              className="select"
              disabled={!building || !building.floors.length}
              value={floor?.id ?? ''}
              required={required && Boolean(building) && !hasDirectAreas}
              aria-describedby={describedBy}
              onChange={(event) =>
                onChange(selectFloor(value, event.target.value ? Number(event.target.value) : null))
              }
            >
              <option value="">{hasDirectAreas ? 'Khu vực chung (không thuộc tầng)' : 'Chọn tầng'}</option>
              {building?.floors.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Phòng / Khu vực (full width) */}
        <div className="field">
          <label className="field__label" htmlFor={`${id}-room`}>
            Phòng / Khu vực{required && <span className="req">*</span>}
          </label>
          <select
            id={`${id}-room`}
            name={`${namePrefix}.locationId`}
            className="select"
            disabled={!building || !locations.length}
            value={
              locations.some(({ id: optionId }) => optionId === value.locationId)
                ? value.locationId!
                : ''
            }
            required={required}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            onChange={(event) =>
              onChange({
                ...value,
                locationId: event.target.value ? Number(event.target.value) : null,
              })
            }
          >
            <option value="">
              {value.floorId === null && hasDirectAreas
                ? 'Chọn khu vực chung'
                : 'Chọn phòng / khu vực'}
            </option>
            {locations.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <p id={helperId} className="field__hint">
            Đổi tòa sẽ chọn lại tầng và phòng. Khu vực chung có thể không thuộc tầng.
          </p>
        </div>

        <div aria-live="polite">
          {loading && <p className="field__hint">Đang tải danh sách địa điểm…</p>}
          {!loading && !loadError && buildings.length === 0 && (
            <p className="field__hint">Chưa có địa điểm đang hoạt động.</p>
          )}
          {!loading &&
            !loadError &&
            building &&
            !locations.length &&
            (value.floorId !== null || !building.floors.length) && (
              <p className="field__hint">Khu vực này chưa có phòng hoặc địa điểm đang hoạt động.</p>
            )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="field__error">
            {error}
          </p>
        )}

        {loadError && (
          <div role="alert" className="field__error">
            Không tải được danh sách địa điểm.{' '}
            {onRetry && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={onRetry}
                disabled={disabled}
              >
                Thử tải lại
              </button>
            )}
          </div>
        )}
      </fieldset>
    </div>
  );
}
