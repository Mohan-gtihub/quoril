"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
  MarkerType,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  IconCheck,
  IconBoard,
  IconBolt,
  IconGlobe,
  IconPlay,
} from "@/components/icons";

/* Single restrained accent — used only for selection, the active wire, and the
   collaborator cursor. Everything else stays in the monochrome paper/ink ramp. */
const ACCENT = "#5B8DEF";

/* ── card shell ──────────────────────────────────────────── */

function Card({
  w,
  label,
  icon,
  selected,
  children,
}: {
  w: number;
  label: string;
  icon: React.ReactNode;
  selected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ width: w }}
      className="group/card relative rounded-card border border-line bg-surface shadow-soft transition-shadow duration-200 hover:shadow-lift"
    >
      {/* header */}
      <div className="flex items-center gap-2 px-3 pt-2.5">
        <span className="grid h-5 w-5 flex-none place-items-center rounded-[6px] border border-line bg-sunken text-ink-muted">
          {icon}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          {label}
        </span>
      </div>
      <div className="px-3 pb-3 pt-2">{children}</div>

      {/* connection points — only surface on hover/selection */}
      <Handle type="target" position={Position.Left} className="rf-dot" />
      <Handle type="source" position={Position.Right} className="rf-dot" />

      {/* selection chrome: ring + corner resize handles */}
      {selected && (
        <>
          <span
            className="pointer-events-none absolute -inset-[3px] rounded-[18px]"
            style={{ boxShadow: `0 0 0 1.5px ${ACCENT}` }}
          />
          {[
            "left-0 top-0",
            "right-0 top-0",
            "left-0 bottom-0",
            "right-0 bottom-0",
          ].map((pos) => (
            <span
              key={pos}
              className={`absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-surface ${pos}`}
              style={{ boxShadow: `0 0 0 1.5px ${ACCENT}` }}
            />
          ))}
        </>
      )}
    </div>
  );
}

/* ── nodes ───────────────────────────────────────────────── */

function IdeaNode({ data, selected }: NodeProps) {
  return (
    <Card w={216} label="Idea" selected={selected} icon={<IconBolt className="h-3 w-3" />}>
      <p className="text-[13px] leading-snug text-ink">{data.body as string}</p>
    </Card>
  );
}

function ChecklistNode({ data, selected }: NodeProps) {
  const items = data.items as { t: string; done: boolean }[];
  return (
    <Card
      w={224}
      label="Checklist"
      selected={selected}
      icon={<IconCheck className="h-3 w-3" />}
    >
      <ul className="flex flex-col gap-1.5">
        {items.map((it) => (
          <li key={it.t} className="flex items-center gap-2.5">
            {it.done ? (
              <span className="grid h-4 w-4 flex-none place-items-center rounded-[5px] bg-ink text-paper">
                <IconCheck className="h-3 w-3" />
              </span>
            ) : (
              <span className="h-4 w-4 flex-none rounded-[5px] border border-line-strong" />
            )}
            <span
              className={`text-[12.5px] ${
                it.done ? "text-ink-faint line-through" : "text-ink"
              }`}
            >
              {it.t}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function LinkNode({ data, selected }: NodeProps) {
  return (
    <Card w={236} label="Link" selected={selected} icon={<IconGlobe className="h-3 w-3" />}>
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 flex-none place-items-center rounded-[7px] border border-line bg-sunken text-[11px] font-semibold text-ink-muted">
          gh
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink">
            {data.title as string}
          </p>
          <p className="truncate text-[11px] text-ink-faint">{data.url as string}</p>
        </div>
      </div>
    </Card>
  );
}

function VideoNode({ data, selected }: NodeProps) {
  const id = data.youtubeId as string;
  return (
    <Card w={268} label="Video" selected={selected} icon={<IconPlay className="h-3 w-3" />}>
      <a
        href={`https://www.youtube.com/watch?v=${id}`}
        target="_blank"
        rel="noreferrer"
        className="group/v block overflow-hidden rounded-[9px] border border-line"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-video w-full bg-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt={data.title as string}
            className="h-full w-full object-cover"
          />
          <span className="absolute inset-0 grid place-items-center bg-ink/0 transition group-hover/v:bg-ink/10">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FF0033] text-white shadow-lift transition group-hover/v:scale-105">
              <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-[1px]" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
          <span className="absolute bottom-1.5 right-1.5 rounded-[4px] bg-ink/80 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-paper">
            4:12
          </span>
        </div>
      </a>
      <p className="mt-2 truncate text-[13px] font-medium text-ink">
        {data.title as string}
      </p>
      <p className="truncate text-[11px] text-ink-faint">{data.channel as string}</p>
    </Card>
  );
}

function TaskRefNode({ data, selected }: NodeProps) {
  return (
    <Card
      w={250}
      label="Task reference"
      selected={selected}
      icon={<IconBoard className="h-3 w-3" />}
    >
      <div className="flex items-center gap-2.5">
        <p className="flex-1 truncate text-[13px] font-medium text-ink">
          {data.label as string}
        </p>
        <span className="flex flex-none items-center gap-1.5 rounded-pill border border-line bg-sunken px-2 py-0.5 text-[10px] font-medium text-ink-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-ink animate-pulse2" />
          {data.status as string}
        </span>
      </div>
    </Card>
  );
}

/* ── graph ───────────────────────────────────────────────── */

const initialNodes: Node[] = [
  {
    id: "idea",
    type: "idea",
    position: { x: 40, y: 36 },
    selected: true,
    data: { body: "Launch the canvas as the centerpiece of the v1 story." },
  },
  {
    id: "checklist",
    type: "checklist",
    position: { x: 24, y: 290 },
    data: {
      items: [
        { t: "Draft block types", done: true },
        { t: "Wire first pipeline", done: true },
        { t: "Record demo clip", done: false },
      ],
    },
  },
  {
    id: "link",
    type: "link",
    position: { x: 770, y: 28 },
    data: { title: "github.com/quoril", url: "https://github.com/quoril" },
  },
  {
    id: "video",
    type: "video",
    position: { x: 408, y: 132 },
    data: {
      youtubeId: "dQw4w9WgXcQ",
      title: "Quoril — canvas walkthrough",
      channel: "Quoril",
    },
  },
  {
    id: "taskref",
    type: "taskref",
    position: { x: 740, y: 360 },
    data: { label: "[25m] Write launch post", status: "active" },
  },
];

const inkMarker = {
  type: MarkerType.ArrowClosed,
  width: 14,
  height: 14,
  color: "rgb(var(--c-ink-faint))",
};

const initialEdges: Edge[] = [
  {
    id: "e-idea-video",
    source: "idea",
    target: "video",
    animated: true,
    style: { stroke: ACCENT, strokeWidth: 1.75 },
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: ACCENT },
  },
  {
    id: "e-video-taskref",
    source: "video",
    target: "taskref",
    style: { stroke: "rgb(var(--c-ink-faint))", strokeWidth: 1.5 },
    markerEnd: inkMarker,
  },
  {
    id: "e-checklist-taskref",
    source: "checklist",
    target: "taskref",
    style: { stroke: "rgb(var(--c-ink-faint))", strokeWidth: 1.5, strokeDasharray: "5 6" },
    markerEnd: inkMarker,
  },
];

/* ── chrome ──────────────────────────────────────────────── */

const ToolIcon = {
  select: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M5 3l14 7-6 1.6L9.8 18 5 3z" />
    </svg>
  ),
  add: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  text: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 6h14M12 6v12" />
    </svg>
  ),
  hand: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M8 12V6.5a1.5 1.5 0 013 0V11m0-1V5.5a1.5 1.5 0 013 0V11m0-.5a1.5 1.5 0 013 0V14c0 3-2 6-5.5 6S11 18 9.5 16.5L6.5 13.4a1.4 1.4 0 012-2L11 13" />
    </svg>
  ),
  comment: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M5 5h14v10H9l-4 4V5z" />
    </svg>
  ),
};

function ToolRail() {
  const [active, setActive] = useState<keyof typeof ToolIcon>("select");
  const tools = Object.keys(ToolIcon) as (keyof typeof ToolIcon)[];
  return (
    <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-surface p-1 shadow-lift">
      {tools.map((t, i) => (
        <div key={t} className="contents">
          <button
            onClick={() => setActive(t)}
            aria-label={t}
            className={`grid h-8 w-8 place-items-center rounded-[9px] transition-colors ${
              active === t
                ? "bg-ink text-paper"
                : "text-ink-muted hover:bg-sunken hover:text-ink"
            }`}
          >
            {ToolIcon[t]}
          </button>
          {i === 0 && <span className="mx-auto my-0.5 h-px w-5 bg-line" />}
        </div>
      ))}
    </div>
  );
}

function ZoomPill({ zoom }: { zoom: number }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <div className="flex items-center gap-0.5 rounded-pill border border-line bg-surface p-1 shadow-lift">
      <button
        onClick={() => zoomOut()}
        aria-label="Zoom out"
        className="grid h-7 w-7 place-items-center rounded-full text-ink-muted hover:bg-sunken hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      </button>
      <button
        onClick={() => fitView({ padding: 0.18, duration: 400 })}
        className="min-w-[46px] rounded-full px-1 text-center text-[11px] font-medium tabular-nums text-ink-muted hover:text-ink"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={() => zoomIn()}
        aria-label="Zoom in"
        className="grid h-7 w-7 place-items-center rounded-full text-ink-muted hover:bg-sunken hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}

/* A single remote collaborator cursor — the small detail that says "live board". */
function Collaborator() {
  return (
    <div className="pointer-events-none absolute left-[46%] top-[58%] z-10 animate-float" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-5 w-5 drop-shadow" style={{ color: ACCENT }} fill="currentColor">
        <path d="M5 3l14 7-6 1.6L9.8 18 5 3z" />
      </svg>
      <span
        className="ml-3 inline-block rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold text-white"
        style={{ background: ACCENT }}
      >
        Maya
      </span>
    </div>
  );
}

/* ── component ───────────────────────────────────────────── */

export default function CanvasFlow() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [zoom, setZoom] = useState(1);

  const nodeTypes = useMemo(
    () => ({
      idea: IdeaNode,
      checklist: ChecklistNode,
      link: LinkNode,
      video: VideoNode,
      taskref: TaskRefNode,
    }),
    [],
  );

  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...c,
            style: { stroke: "rgb(var(--c-ink-faint))", strokeWidth: 1.5 },
            markerEnd: inkMarker,
          },
          eds,
        ),
      ),
    [setEdges],
  );

  return (
    <div className="canvas-board relative h-[440px] bg-paper sm:h-[500px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMove={(_, vp: Viewport) => setZoom(vp.zoom)}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.5}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        selectionOnDrag={false}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.3} color="rgb(var(--c-line-strong))" />
        <Panel position="top-left">
          <ToolRail />
        </Panel>
        <Panel position="bottom-right">
          <ZoomPill zoom={zoom} />
        </Panel>
      </ReactFlow>
      <Collaborator />
    </div>
  );
}
