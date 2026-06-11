"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { feature } from "topojson-client";
import landTopo from "world-atlas/land-110m.json";
import { latLngToVector3 } from "@/lib/geo";
import { travel } from "@/lib/data";
import { loc, type Locale } from "@/i18n/config";
import type { Place } from "@/types";

const R = 1.6;
const ACCENT = "#00ffcc";

/**
 * Decode world-atlas land into a flat list of polygons (each = array of rings).
 * topojson `feature()` may return a Feature (Polygon/MultiPolygon) or a
 * FeatureCollection (GeometryCollection) depending on the source object, so we
 * normalise every shape here. Cached at module scope (computed once).
 */
let cachedLandPolygons: number[][][][] | null = null;
function getLandPolygons(): number[][][][] {
  if (cachedLandPolygons) return cachedLandPolygons;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topo = landTopo as any;
  const decoded = feature(topo, topo.objects.land);
  const polygons: number[][][][] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addGeometry = (geom: any) => {
    if (!geom) return;
    if (geom.type === "Polygon") polygons.push(geom.coordinates);
    else if (geom.type === "MultiPolygon")
      for (const p of geom.coordinates) polygons.push(p);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = decoded as any;
  if (d.type === "FeatureCollection")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const f of d.features) addGeometry(f.geometry);
  else if (d.type === "Feature") addGeometry(d.geometry);
  else addGeometry(d); // raw geometry

  cachedLandPolygons = polygons;
  return polygons;
}

/**
 * Real continents drawn as coastline polylines from Natural Earth land data
 * (world-atlas 110m, decoded with topojson). Each ring becomes line segments
 * projected onto the sphere — the "green pixel-line world map" look.
 */
function Continents() {
  const positions = useMemo(() => {
    const polygons = getLandPolygons();

    const pts: number[] = [];
    for (const poly of polygons) {
      for (const ring of poly) {
        for (let i = 0; i < ring.length - 1; i++) {
          const a = latLngToVector3(ring[i][1], ring[i][0], R + 0.006);
          const b = latLngToVector3(ring[i + 1][1], ring[i + 1][0], R + 0.006);
          pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }
    return new Float32Array(pts);
  }, []);

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={ACCENT}
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </lineSegments>
  );
}

/** Land-only dot fill sampled on a lat/lng grid, masked by the land polygons. */
function LandDots() {
  const positions = useMemo(() => {
    const polygons = getLandPolygons();

    const inRing = (lng: number, lat: number, ring: number[][]) => {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0],
          yi = ring[i][1];
        const xj = ring[j][0],
          yj = ring[j][1];
        const intersect =
          yi > lat !== yj > lat &&
          lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    };
    const onLand = (lng: number, lat: number) => {
      for (const poly of polygons) {
        if (poly.length === 0) continue;
        if (inRing(lng, lat, poly[0])) {
          let hole = false;
          for (let h = 1; h < poly.length; h++) {
            if (inRing(lng, lat, poly[h])) {
              hole = true;
              break;
            }
          }
          if (!hole) return true;
        }
      }
      return false;
    };

    const pts: number[] = [];
    const step = 2; // degrees
    for (let lat = -84; lat <= 84; lat += step) {
      for (let lng = -180; lng < 180; lng += step) {
        if (onLand(lng, lat)) {
          const v = latLngToVector3(lat, lng, R + 0.003);
          pts.push(v.x, v.y, v.z);
        }
      }
    }
    return new Float32Array(pts);
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color={ACCENT}
        transparent
        opacity={0.65}
        sizeAttenuation
      />
    </points>
  );
}

/** Fibonacci-sphere point cloud that gives the globe its dotted-pixel skin. */
function DotSphere() {
  const positions = useMemo(() => {
    const count = 2600;
    const arr = new Float32Array(count * 3);
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;
      arr[i * 3] = Math.cos(theta) * radius * R;
      arr[i * 3 + 1] = y * R;
      arr[i * 3 + 2] = Math.sin(theta) * radius * R;
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.012}
        color={ACCENT}
        transparent
        opacity={0.12}
        sizeAttenuation
      />
    </points>
  );
}

function PlaceMarker({
  place,
  isHome,
  onHover,
  onLeave,
  active,
}: {
  place: { lat: number; lng: number };
  isHome?: boolean;
  onHover: () => void;
  onLeave: () => void;
  active: boolean;
}) {
  const { pos, quat } = useMemo(() => {
    const p = latLngToVector3(place.lat, place.lng, R + 0.01);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      p.clone().normalize(),
    );
    return { pos: p, quat: q };
  }, [place.lat, place.lng]);

  const color = isHome ? "#ffffff" : ACCENT;
  const radius = active ? 0.028 : 0.02;

  return (
    <group position={pos} quaternion={quat}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover();
        }}
        onPointerOut={onLeave}
      >
        <sphereGeometry args={[radius, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function GlobeControls({ paused }: { paused: boolean }) {
  const ref = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    controls.autoRotate = !paused;
  }, [paused]);

  useFrame(() => {
    const controls = ref.current;
    if (!controls) return;
    controls.autoRotate = !paused;
  });

  return (
    <OrbitControls
      ref={ref}
      enablePan={false}
      enableZoom={false}
      enableDamping={false}
      autoRotate={!paused}
      autoRotateSpeed={0.6}
      rotateSpeed={0.5}
      minPolarAngle={Math.PI / 3}
      maxPolarAngle={(2 * Math.PI) / 3}
    />
  );
}

function Scene({
  onSelect,
  locale,
  mapPaused,
}: {
  onSelect: (p: Place | null) => void;
  locale: Locale;
  mapPaused: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  const hoveredPlace =
    travel.places.find((p) => p.id === hovered) ?? null;

  return (
    <>
      <ambientLight intensity={0.6} />
      <group ref={groupRef}>
        {/* dark inner sphere for depth + back-face occlusion */}
        <mesh>
          <sphereGeometry args={[R - 0.02, 48, 48]} />
          <meshStandardMaterial
            color="#04100d"
            roughness={1}
            metalness={0}
          />
        </mesh>
        {/* wireframe shell */}
        <mesh>
          <sphereGeometry args={[R, 24, 24]} />
          <meshBasicMaterial
            color={ACCENT}
            wireframe
            transparent
            opacity={0.06}
          />
        </mesh>
        <DotSphere />
        <LandDots />
        <Continents />

        <PlaceMarker
          place={travel.home}
          isHome
          active={false}
          onHover={() => {}}
          onLeave={() => {}}
        />
        {travel.places.map((p) => (
          <PlaceMarker
            key={p.id}
            place={p}
            active={hovered === p.id}
            onHover={() => {
              setHovered(p.id);
              onSelect(p);
            }}
            onLeave={() => {
              setHovered(null);
              onSelect(null);
            }}
          />
        ))}

        {hoveredPlace && (
          <Html
            position={latLngToVector3(
              hoveredPlace.lat,
              hoveredPlace.lng,
              R + 0.15,
            )}
            center
            distanceFactor={6}
            zIndexRange={[10, 0]}
          >
            <div className="pointer-events-none w-44 -translate-y-1/2 rounded-lg border border-accent/40 bg-black/85 p-2.5 backdrop-blur">
              <div className="mono text-[10px] text-accent">
                {hoveredPlace.emoji} {hoveredPlace.name} :: {hoveredPlace.country}
              </div>
              <div className="mono mt-1 text-[9px] text-titanium/70">
                {loc(hoveredPlace.note, locale)}
              </div>
              <div className="mono mt-1 text-[8px] text-muted">
                lat {hoveredPlace.lat.toFixed(2)} / lng{" "}
                {hoveredPlace.lng.toFixed(2)}
              </div>
            </div>
          </Html>
        )}
      </group>

      <GlobeControls paused={mapPaused} />
    </>
  );
}

export default function Globe({
  onSelect,
  locale,
  mapPaused = false,
}: {
  onSelect?: (p: Place | null) => void;
  locale: Locale;
  mapPaused?: boolean;
}) {
  return (
    <Canvas
      className="h-full w-full"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene
        onSelect={onSelect ?? (() => {})}
        locale={locale}
        mapPaused={mapPaused}
      />
    </Canvas>
  );
}
