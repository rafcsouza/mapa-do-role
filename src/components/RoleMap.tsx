import { useEffect, useRef } from 'react'
import { GeolocateControl, Map as MLMap, NavigationControl, type GeoJSONSource } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { CATEGORIES, type RoleEvent } from '../lib/types'

const STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

interface Props {
  events: RoleEvent[]
  center: [number, number]
  showHeat: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
}

function toGeoJSON(events: RoleEvent[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: events.map((e) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.venue.lng, e.venue.lat] },
      properties: { id: e.id, category: e.category },
    })),
  }
}

const colorExpr = [
  'match',
  ['get', 'category'],
  ...CATEGORIES.flatMap((c) => [c.id, c.color]),
  '#94a3b8',
] as unknown as string // expressão 'match' do MapLibre; o tipo exato não é exportado

export function RoleMap({ events, center, showHeat, selectedId, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const ready = useRef(false)
  const latest = useRef({ events, showHeat, selectedId, onSelect })
  latest.current = { events, showHeat, selectedId, onSelect }

  useEffect(() => {
    const map = new MLMap({
      container: ref.current!,
      style: STYLE,
      center,
      zoom: 12,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(
      new GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }),
      'bottom-right',
    )

    map.on('load', () => {
      map.addSource('events', { type: 'geojson', data: toGeoJSON(latest.current.events), promoteId: 'id' })

      map.addLayer({
        id: 'heat',
        type: 'heatmap',
        source: 'events',
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 15, 2],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 15, 45],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.85, 16, 0.25],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(76,29,149,0.55)',
            0.45, 'rgba(139,92,246,0.7)',
            0.7, 'rgba(255,61,129,0.8)',
            1, 'rgba(255,200,87,0.9)',
          ],
        },
      })

      map.addLayer({
        id: 'points-halo',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 16, 0],
          'circle-color': colorExpr,
          'circle-opacity': 0.25,
        },
      })

      map.addLayer({
        id: 'points',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3.5, 15, 8],
          'circle-color': colorExpr,
          'circle-stroke-color': '#0b0b10',
          'circle-stroke-width': 1.5,
        },
      })

      map.on('click', 'points', (ev) => {
        const id = ev.features?.[0]?.properties?.id as string | undefined
        if (id) latest.current.onSelect(id)
      })
      map.on('click', (ev) => {
        if (!map.queryRenderedFeatures(ev.point, { layers: ['points'] }).length) latest.current.onSelect(null)
      })
      map.on('mouseenter', 'points', () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', 'points', () => (map.getCanvas().style.cursor = ''))

      ready.current = true
      map.setLayoutProperty('heat', 'visibility', latest.current.showHeat ? 'visible' : 'none')
    })

    return () => map.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready.current) return
    ;(map.getSource('events') as GeoJSONSource).setData(toGeoJSON(events))
  }, [events])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready.current) return
    map.setLayoutProperty('heat', 'visibility', showHeat ? 'visible' : 'none')
  }, [showHeat])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready.current) return
    map.removeFeatureState({ source: 'events' })
    if (!selectedId) return
    map.setFeatureState({ source: 'events', id: selectedId }, { selected: true })
    const e = events.find((x) => x.id === selectedId)
    if (e) map.easeTo({ center: [e.venue.lng, e.venue.lat], zoom: Math.max(map.getZoom(), 14), duration: 600 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  return <div ref={ref} className="map" />
}
