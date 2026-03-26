import React, { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  Connection,
  Panel,
  PanOnScrollMode
} from 'reactflow';
import 'reactflow/dist/style.css';
import BusinessNode from './BusinessNode';
import { useStore } from '../../store/useStore';
import { useGraphData } from '../../services/api';
import { 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  LayoutGrid,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const nodeTypes = {
  business: BusinessNode,
};

export default function GraphView() {
  const { setSelectedNode, highlightedNodes } = useStore();
  const { data: graphData, isLoading, refetch } = useGraphData();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (graphData) {
      const layoutedNodes = graphData.nodes.map((n: any, i: number) => ({
        ...n,
        type: 'business',
        position: n.position || { x: (i % 8) * 200, y: Math.floor(i / 8) * 180 },
        data: { ...n.data, type: n.type, label: n.label },
        style: {
          opacity: highlightedNodes.length > 0 && !highlightedNodes.includes(n.id) ? 0.3 : 1,
          transition: 'opacity 0.3s ease-in-out',
        }
      }));

      const layoutedEdges = graphData.edges.map((e: any) => ({
        ...e,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366F1' },
        style: { 
          stroke: '#6366F1', 
          strokeWidth: 1.5,
          opacity: highlightedNodes.length > 0 && !(highlightedNodes.includes(e.source) && highlightedNodes.includes(e.target)) ? 0.1 : 1,
        },
        label: e.label,
        labelStyle: { fill: '#94A3B8', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
        labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.9 },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 6,
      }));

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [graphData, setNodes, setEdges, highlightedNodes]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm font-medium text-muted">Building business graph...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background relative overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        panOnScroll={true}
        panOnScrollMode={PanOnScrollMode.Free}
        selectionOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={true}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background color="#E2E8F0" gap={40} size={1} />
        <Controls className="!bg-white !border-border !shadow-xl !rounded-xl overflow-hidden" />
      </ReactFlow>
    </div>
  );
}
