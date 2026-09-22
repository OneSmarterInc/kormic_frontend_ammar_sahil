import React, { useEffect, useState, useRef } from "react";
import { Sparkles, Terminal, Activity, ArrowRight, XCircle, Search } from "lucide-react";
import toast from "react-hot-toast";

import { listAgentAuditLog } from "../../api/superuserApi";
import PageHeader from "../../components/layout/PageHeader";

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AgentAuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState(null);
  
  const lastIdRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchLogs = async (isInitial = false) => {
    try {
      const params = { limit: 50 };
      if (studentId) params.studentId = studentId;
      if (!isInitial && lastIdRef.current) {
        params.sinceId = lastIdRef.current;
      }
      
      const data = await listAgentAuditLog(params);
      const fetchedLogs = data.logs || [];
      
      if (fetchedLogs.length > 0) {
        // The API returns newest first if no since_id, and oldest first if since_id is used.
        // We always want to append newest to the top in the UI or bottom depending on design.
        // Let's prepend newest to the top.
        setLogs(prev => {
          // Filter out duplicates just in case
          const existingIds = new Set(prev.map(l => l.id));
          const newLogs = fetchedLogs.filter(l => !existingIds.has(l.id));
          
          if (newLogs.length === 0) return prev;
          
          // Sort descending
          const combined = [...newLogs, ...prev].sort((a, b) => b.id - a.id);
          // Keep only top 200 to prevent browser lag
          return combined.slice(0, 200);
        });
        
        // Update max id seen
        const maxId = Math.max(...fetchedLogs.map(l => l.id));
        if (!lastIdRef.current || maxId > lastIdRef.current) {
          lastIdRef.current = maxId;
        }
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch logs. Check console.");
    }
  };

  useEffect(() => {
    // Initial fetch
    setLogs([]);
    lastIdRef.current = null;
    fetchLogs(true);
  }, [studentId]);

  useEffect(() => {
    if (!isPolling) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    
    intervalRef.current = setInterval(() => {
      fetchLogs(false);
    }, 3000);
    
    return () => clearInterval(intervalRef.current);
  }, [isPolling, studentId]);

  const handleStudentFilterChange = (e) => {
    setStudentId(e.target.value);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Live Agent Telemetry"
        description="Real-time observability into agent reasoning, tool usage, and inter-agent communication."
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
        <div className="flex w-full sm:w-1/2 items-center gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              type="text"
              placeholder="Filter by Student ID (UUID)..."
              value={studentId}
              onChange={handleStudentFilterChange}
              className="w-full rounded-lg border border-ink-200 bg-ink-50 py-2 pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-ink-600">
            {isPolling ? (
              <span className="flex items-center gap-1.5 text-green-600">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Live Polling Active
              </span>
            ) : (
              <span className="text-ink-500">Polling Paused</span>
            )}
          </span>
          <button
            onClick={() => setIsPolling(!isPolling)}
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            {isPolling ? "Pause" : "Resume"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 border border-red-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-ink-200 bg-[#0c1322] shadow-sm overflow-hidden flex flex-col font-mono text-sm h-[600px]">
        <div className="flex h-10 shrink-0 items-center border-b border-white/10 bg-[#111928] px-4 text-white/50 space-x-6 text-xs">
          <div className="w-20">TIME</div>
          <div className="w-40">AGENT</div>
          <div className="w-48">ACTION</div>
          <div className="flex-1">DETAILS</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
          {logs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-white/30">
              {isPolling ? "Waiting for agent activity..." : "No logs to display"}
            </div>
          ) : (
            logs.map(log => (
              <LogEntry key={log.id} log={log} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function LogEntry({ log }) {
  const getActionColor = (type) => {
    if (type.includes("ERROR")) return "text-red-400";
    if (type.includes("COMMUNICATION")) return "text-purple-400";
    if (type.includes("REASONING") || type.includes("FINAL")) return "text-green-400";
    if (type.includes("TOOL")) return "text-cyan-400";
    return "text-white/70";
  };
  
  const getIcon = (type) => {
    if (type.includes("ERROR")) return <XCircle className="h-4 w-4" />;
    if (type.includes("COMMUNICATION")) return <Sparkles className="h-4 w-4" />;
    if (type.includes("TOOL")) return <Terminal className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 border-l-2 border-white/10 pl-3 hover:bg-white/5 p-2 rounded transition-colors group">
      <div className="w-20 shrink-0 text-white/40 pt-0.5 whitespace-nowrap">
        {formatTimestamp(log.timestamp)}
      </div>
      <div className="w-40 shrink-0 text-white/80 font-semibold truncate pt-0.5" title={log.actor_agent}>
        {log.actor_agent}
      </div>
      <div className={`w-48 shrink-0 flex items-start gap-2 pt-0.5 ${getActionColor(log.action_type)}`}>
        {getIcon(log.action_type)}
        <span className="truncate" title={log.action_type}>{log.action_type}</span>
      </div>
      <div className="flex-1 min-w-0 text-white/70 break-words bg-black/20 p-2 rounded">
        {log.target && log.target !== "unknown" && log.target !== "unknown_tool" && (
          <div className="mb-1 text-white/90 font-semibold flex items-center gap-1.5">
            <ArrowRight className="h-3 w-3 text-white/40" />
            {log.target}
          </div>
        )}
        
        {Object.keys(log.inputs).length > 0 && (
          <div className="text-white/60 text-xs mb-1">
            <span className="text-white/40 uppercase tracking-widest mr-2 text-[10px]">IN:</span>
            {JSON.stringify(log.inputs)}
          </div>
        )}
        {Object.keys(log.outputs).length > 0 && (
          <div className="text-white/80 text-xs">
            <span className="text-white/40 uppercase tracking-widest mr-2 text-[10px]">OUT:</span>
            {JSON.stringify(log.outputs)}
          </div>
        )}
      </div>
    </div>
  );
}
