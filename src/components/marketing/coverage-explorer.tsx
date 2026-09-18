"use client";

import {useCallback, useEffect, useId, useRef, useState} from "react";
import {feature as topoFeature} from "topojson-client";
import type {Feature, FeatureCollection, Geometry} from "geojson";
import {MARKETING_COUNTRIES, type MarketingCountry} from "@/lib/marketing-coverage";
import "./coverage-explorer.css";

type Point = {x: number; y: number; z: number};
type GlobeCountry = MarketingCountry & {point?: Point};
const DEG = Math.PI / 180;
const MARKER_COUNTRIES = new Set(["NG", "GB", "US", "DE", "IT", "FR", "IE", "NL"]);
const GRATICULES = [
  ...Array.from({length: 5}, (_, row) => Array.from({length: 121}, (_, column) => [-180 + column * 3, -60 + row * 30])),
  ...Array.from({length: 12}, (_, column) => Array.from({length: 61}, (_, row) => [-180 + column * 30, -90 + row * 3])),
];

function CountryFlag({code}: {code: string}) {
  return <span className={`cov-flag cov-flag-${code.toLowerCase()}${MARKER_COUNTRIES.has(code) ? "" : " cov-flag-code"}`} aria-hidden="true">{code}</span>;
}

export function CoverageExplorer() {
  const initialCountry = MARKETING_COUNTRIES.find((country) => country.iso2 === "GB") ?? MARKETING_COUNTRIES[0];
  const [selected, setSelected] = useState(initialCountry);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rotating, setRotating] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const redrawRef = useRef<() => void>(() => {});
  const countriesRef = useRef<GlobeCountry[]>(MARKETING_COUNTRIES.map((country) => ({...country})));
  const worldRef = useRef<Feature<Geometry>[]>([]);
  const stateRef = useRef({
    rotX: 0.22, rotY: -0.3, targetX: 0.22, targetY: -0.3,
    auto: true, drag: false, reduced: false, visible: false,
    lastX: 0, lastY: 0, downX: 0, downY: 0,
    width: 0, height: 0, radius: 0, cx: 0, cy: 0,
    selected: initialCountry as MarketingCountry,
    hover: null as GlobeCountry | null,
  });
  const listId = useId();
  const results = MARKETING_COUNTRIES.filter((country) =>
    `${country.name} ${country.iso2}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const choose = useCallback((country: MarketingCountry) => {
    const state = stateRef.current;
    state.selected = country;
    state.auto = false;
    const target = -country.lon * DEG;
    state.targetY = state.rotY + Math.atan2(Math.sin(target - state.rotY), Math.cos(target - state.rotY));
    state.targetX = Math.min(0.7, Math.max(-0.7, country.lat * DEG * 0.7));
    setSelected(country);
    setRotating(false);
    setQuery("");
    setSearchOpen(false);
    setActiveIndex(0);
    redrawRef.current();
  }, []);

  useEffect(() => {
    if (searchOpen && results[activeIndex]) {
      document.getElementById(`${listId}-${results[activeIndex].code}`)?.scrollIntoView({block: "nearest"});
    }
  }, [activeIndex, listId, results, searchOpen]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/images/landing/world-countries.json", {signal: controller.signal})
      .then((response) => {
        if (!response.ok) throw new Error("Map unavailable");
        return response.json();
      })
      .then((world: {objects: {countries: object}}) => {
        const collection = topoFeature(world as never, world.objects.countries as never) as unknown as FeatureCollection;
        worldRef.current = collection.features;
        redrawRef.current();
      })
      // Country search and route information work independently of the map.
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = globeRef.current;
    const tooltip = tooltipRef.current;
    if (!canvas || !wrapper) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const state = stateRef.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastFrame = 0;
    let dirty = true;
    let alive = true;

    function point(latitude: number, longitude: number): Point {
      const p = latitude * DEG;
      const l = longitude * DEG + state.rotY;
      const x = Math.cos(p) * Math.sin(l);
      const y = Math.sin(p);
      const z = Math.cos(p) * Math.cos(l);
      return {
        x: state.cx + x * state.radius,
        y: state.cy - (y * Math.cos(state.rotX) - z * Math.sin(state.rotX)) * state.radius,
        z: y * Math.sin(state.rotX) + z * Math.cos(state.rotX),
      };
    }

    function ringPath(ring: number[][], close = true) {
      let drawing = false;
      let fullyVisible = true;
      for (const coordinate of ring) {
        const projected = point(coordinate[1], coordinate[0]);
        if (projected.z > 0.015) {
          if (drawing) context!.lineTo(projected.x, projected.y);
          else context!.moveTo(projected.x, projected.y);
          drawing = true;
        } else {
          drawing = false;
          fullyVisible = false;
        }
      }
      if (fullyVisible && close) context!.closePath();
      return fullyVisible;
    }

    function geometryPath(geometry: Geometry) {
      context!.beginPath();
      let fullyVisible = true;
      if (geometry.type === "Polygon") {
        for (const ring of geometry.coordinates) fullyVisible = ringPath(ring) && fullyVisible;
      } else if (geometry.type === "MultiPolygon") {
        for (const polygon of geometry.coordinates) for (const ring of polygon) fullyVisible = ringPath(ring) && fullyVisible;
      }
      return fullyVisible;
    }

    function draw() {
      context!.clearRect(0, 0, state.width, state.height);
      const {cx, cy, radius} = state;
      if (!radius) return;
      const sphere = context!.createRadialGradient(cx - radius * 0.5, cy - radius * 0.6, radius * 0.04, cx, cy, radius * 1.1);
      sphere.addColorStop(0, "#116e74");
      sphere.addColorStop(0.45, "#07505a");
      sphere.addColorStop(0.82, "#06333e");
      sphere.addColorStop(1, "#051b26");
      context!.beginPath();
      context!.arc(cx, cy, radius, 0, Math.PI * 2);
      context!.fillStyle = sphere;
      context!.fill();
      context!.strokeStyle = "#51d3c977";
      context!.lineWidth = 1;
      context!.stroke();
      context!.save();
      context!.clip();
      context!.strokeStyle = "#69e2d012";
      context!.lineWidth = 0.6;
      for (const line of GRATICULES) {
        context!.beginPath();
        ringPath(line, false);
        context!.stroke();
      }
      for (const country of worldRef.current) {
        if (!country.geometry) continue;
        const visible = geometryPath(country.geometry);
        const selected = String(country.id ?? "").padStart(3, "0") === state.selected.code;
        // Open contours on the far hemisphere cannot be filled without
        // introducing false diagonal edges across the globe.
        if (visible) {
          context!.fillStyle = selected ? "#5ddbc5" : "#28908355";
          context!.fill("evenodd");
        }
        context!.strokeStyle = selected ? "#a8ffeb" : "#5ec6b487";
        context!.lineWidth = selected ? 1.25 : 0.65;
        context!.stroke();
      }
      context!.restore();
      for (const country of countriesRef.current) {
        if (!MARKER_COUNTRIES.has(country.iso2) && country.code !== state.selected.code) {
          country.point = undefined;
          continue;
        }
        const projected = point(country.lat, country.lon);
        country.point = projected;
        if (projected.z <= 0.03) continue;
        const selected = country.code === state.selected.code;
        context!.beginPath();
        context!.arc(projected.x, projected.y, selected ? 5 : 2.5, 0, Math.PI * 2);
        context!.fillStyle = selected ? "#eafffa" : "#7aefda";
        context!.fill();
        if (selected) {
          context!.beginPath();
          context!.arc(projected.x, projected.y, 11, 0, Math.PI * 2);
          context!.strokeStyle = "#c5ffee66";
          context!.lineWidth = 1;
          context!.stroke();
        }
      }
      const selectedPoint = point(state.selected.lat, state.selected.lon);
      if (tooltip) {
        tooltip.style.left = `${selectedPoint.x}px`;
        tooltip.style.top = `${selectedPoint.y}px`;
        tooltip.style.opacity = selectedPoint.z > 0.15 ? "1" : "0";
      }
    }

    function render(timestamp: number) {
      frame = 0;
      if (!alive || !state.visible || document.hidden) return;
      const elapsed = timestamp - lastFrame;
      if (elapsed >= 32) {
        const factor = state.reduced ? 1 : Math.min(elapsed / 150, 0.3);
        state.rotX += (state.targetX - state.rotX) * factor;
        state.rotY += (state.targetY - state.rotY) * factor;
        if (state.auto && !state.drag && !state.reduced) state.targetY += Math.min(elapsed, 64) * 0.000035;
        draw();
        dirty = false;
        lastFrame = timestamp;
      }
      const moving = Math.abs(state.targetX - state.rotX) + Math.abs(state.targetY - state.rotY) > 0.0002;
      if (dirty || (!state.reduced && state.auto) || moving) frame = requestAnimationFrame(render);
    }
    function requestDraw() {
      dirty = true;
      if (alive && !frame && state.visible && !document.hidden) frame = requestAnimationFrame(render);
    }
    redrawRef.current = requestDraw;

    function resize() {
      const box = wrapper!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.width = box.width;
      state.height = box.height;
      state.radius = Math.min(box.width, box.height) * 0.435;
      state.cx = box.width / 2;
      state.cy = box.height / 2;
      canvas!.width = Math.round(box.width * dpr);
      canvas!.height = Math.round(box.height * dpr);
      context!.setTransform(dpr, 0, 0, dpr, 0, 0);
      requestDraw();
    }
    function nearestCountry(x: number, y: number) {
      let nearest: GlobeCountry | null = null;
      let distance = 19;
      for (const country of countriesRef.current) {
        if (!country.point || country.point.z <= 0.03) continue;
        const candidateDistance = Math.hypot(country.point.x - x, country.point.y - y);
        if (candidateDistance < distance) { distance = candidateDistance; nearest = country; }
      }
      return nearest;
    }
    function pointerDown(event: PointerEvent) {
      state.drag = true;
      state.auto = false;
      setRotating(false);
      state.lastX = state.downX = event.clientX;
      state.lastY = state.downY = event.clientY;
      canvas!.setPointerCapture(event.pointerId);
    }
    function pointerMove(event: PointerEvent) {
      if (state.drag) {
        state.targetY += (event.clientX - state.lastX) * 0.007;
        state.targetX = Math.max(-0.8, Math.min(0.8, state.targetX - (event.clientY - state.lastY) * 0.005));
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        requestDraw();
      } else {
        const box = canvas!.getBoundingClientRect();
        state.hover = nearestCountry(event.clientX - box.left, event.clientY - box.top);
        canvas!.style.cursor = state.hover ? "pointer" : "grab";
      }
    }
    function pointerUp(event: PointerEvent) {
      if (!state.drag) return;
      state.drag = false;
      if (canvas!.hasPointerCapture(event.pointerId)) canvas!.releasePointerCapture(event.pointerId);
      if (Math.hypot(event.clientX - state.downX, event.clientY - state.downY) > 7) return;
      const box = canvas!.getBoundingClientRect();
      const country = nearestCountry(event.clientX - box.left, event.clientY - box.top);
      if (country) choose(country);
    }
    function pointerCancel() { state.drag = false; }
    function updateMotion() { state.reduced = motion.matches; requestDraw(); }
    function visibilityChange() {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else requestDraw();
    }
    state.reduced = motion.matches;
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrapper);
    const intersection = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
      if (!state.visible) { cancelAnimationFrame(frame); frame = 0; }
      else requestDraw();
    }, {threshold: 0.01});
    intersection.observe(wrapper);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerCancel);
    motion.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", visibilityChange);
    resize();
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerCancel);
      motion.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", visibilityChange);
      redrawRef.current = () => {};
    };
  }, [choose]);

  return (
    <section className="cov-section" id="coverage" aria-labelledby="cov-title">
      <div className="cov-inner">
        <div className="cov-copy">
          <p className="cov-eyebrow"><span />Explore our coverage</p>
          <h2 id="cov-title">A world of possibilities.<br /><em>A route for you.</em></h2>
          <p className="cov-intro">Explore funding currencies by residence. Choose your payout destination during setup.</p>
          <div className="cov-search-wrap" onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) { setSearchOpen(false); setQuery(""); }
          }}>
            <label className="cov-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
              <input role="combobox" aria-label="Search country of residence" aria-autocomplete="list" aria-expanded={searchOpen} aria-controls={searchOpen ? listId : undefined}
                aria-activedescendant={searchOpen && results[activeIndex] ? `${listId}-${results[activeIndex].code}` : undefined}
                placeholder="Find your country" autoComplete="off" value={query}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setSearchOpen(true); }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault(); setSearchOpen(true);
                    const step = event.key === "ArrowDown" ? 1 : -1;
                    setActiveIndex((index) => Math.max(0, Math.min(results.length - 1, index + step)));
                  } else if (event.key === "Enter" && searchOpen && results[activeIndex]) {
                    event.preventDefault(); choose(results[activeIndex]);
                  } else if (event.key === "Escape") { setSearchOpen(false); setQuery(""); }
                }}
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
            </label>
            {searchOpen && <ul className="cov-options" id={listId} role="listbox" aria-label="Countries">
              {results.length ? results.map((country, index) => <li id={`${listId}-${country.code}`} role="option" aria-selected={selected.code === country.code}
                className={activeIndex === index ? "cov-option-active" : ""} key={country.code}
                onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(country)}
              ><CountryFlag code={country.iso2} /><span>{country.name}</span>{selected.code === country.code && <span className="cov-check">✓</span>}</li>) : <li className="cov-no-results" role="presentation">No matching residence is listed. Try another name.</li>}
            </ul>}
          </div>
          <div className="cov-country-card" aria-live="polite" aria-atomic="true">
            <div className="cov-country-head"><CountryFlag code={selected.iso2} /><div><small>Your residence</small><h3>{selected.name}</h3></div><span className="cov-country-arrow" aria-hidden="true">↗</span></div>
            <dl className="cov-routes">
              <div><dt>Bank pay-in</dt><dd>{selected.payIn.length ? selected.payIn.join(" · ") : "Not listed"}</dd></div>
              <div><dt>Bank payout</dt><dd className="cov-payout-note">By destination</dd></div>
            </dl>
            <p className="cov-qualification">Availability depends on your residence, account type, currency and network.</p>
          </div>
        </div>
        <div className="cov-globe-column">
          <div className="cov-globe" ref={globeRef}>
            <div className="cov-orbit cov-orbit-one" aria-hidden="true" /><div className="cov-orbit cov-orbit-two" aria-hidden="true" />
            <canvas ref={canvasRef} aria-label="Globe showing listed countries. Drag to rotate, or use the country search to select a residence." role="img" />
            <div className="cov-map-label" ref={tooltipRef} aria-hidden="true"><span />{selected.name}</div>
          </div>
          <div className="cov-globe-controls">
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m7 8-4 4 4 4m10-8 4 4-4 4M3 12h18" /></svg>Drag to explore</span>
            <button type="button" className="cov-rotation-button" aria-pressed={rotating} onClick={() => {
              stateRef.current.auto = !rotating; setRotating(!rotating); redrawRef.current();
            }}>{rotating ? "Pause globe" : "Rotate globe"}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
