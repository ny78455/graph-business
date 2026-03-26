import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

const nodeTypes = {
  // Custom node types if needed
};

interface GraphViewProps {
  onNodeClick: (node: Node) => void;
}

export default function GraphView({ onNodeClick }: GraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const fetchGraph = useCallback(async () => {
    try {
      const response = await fetch('/api/graph');
      const data = await response.json();
      
      // Layout nodes in a simple grid for now
      // In a real app, use a layout engine like dagre
      const layoutedNodes = data.nodes.map((n: any, i: number) => ({
        ...n,
        position: { x: (i % 5) * 250, y: Math.floor(i / 5) * 150 },
        style: {
          background: n.type === 'header' ? '#3b82f6' : 
                      n.type === 'customer' ? '#10b981' : 
                      n.type === 'item' ? '#f59e0b' : '#ef4444',
          color: '#fff',
          borderRadius: '8px',
          padding: '10px',
          width: 180,
          textAlign: 'center',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }
      }));

      const layoutedEdges = data.edges.map((e: any) => ({
        ...e,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
        style: { stroke: '#94a3b8' }
      }));

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (error) {
      console.error('Error fetching graph:', error);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <div className="w-full h-full bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onNodeClick(node)}
        fitView
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>
    </div>
  );
}
