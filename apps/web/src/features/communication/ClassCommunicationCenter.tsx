import React, { useEffect, useState, useRef } from 'react';
import { getApiUrl } from '../../lib/api';
import {
  MessageSquare,
  Send,
  Pin,
  Users,
  Clock,
  ChevronRight,
  Shield,
  AlertTriangle,
  Volume2,
  VolumeX,
  BookOpen,
  Megaphone,
  Lock,
  Wifi,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

interface ChatSession {
  id: string;
  sectionLabel: string;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  status: 'TODAY' | 'UPCOMING' | 'CLOSED';
  scheduledAt: string;
  durationMinutes: number;
  participantCount: number;
}

interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: 'FACULTY' | 'CR' | 'SYS_EVENT' | 'OFFICIAL_DIRECTIVE';
  content: string;
  timestamp: string;
  pinned?: boolean;
}

interface PinnedDirective {
  id: string;
  title: string;
  content: string;
  issuedBy: string;
  issuedAt: string;
}

const MOCK_SESSIONS: ChatSession[] = [
  {
    id: 'sess-001',
    sectionLabel: 'CSE-B',
    subjectCode: '22CSSPCDAA',
    subjectName: 'Design & Analysis of Algorithms',
    facultyName: 'Dr. A. Ramanathan',
    status: 'TODAY',
    scheduledAt: '09:00–10:00',
    durationMinutes: 60,
    participantCount: 62,
  },
  {
    id: 'sess-002',
    sectionLabel: 'CSE-B',
    subjectCode: '22CSPC204',
    subjectName: 'Database Management Systems',
    facultyName: 'Prof. Sneha K.',
    status: 'TODAY',
    scheduledAt: '11:00–12:00',
    durationMinutes: 60,
    participantCount: 62,
  },
  {
    id: 'sess-003',
    sectionLabel: 'CSE-B',
    subjectCode: '22CSPC205',
    subjectName: 'Computer Networks',
    facultyName: 'Dr. Rajeshwari V.',
    status: 'UPCOMING',
    scheduledAt: 'Tomorrow 10:00–11:00',
    durationMinutes: 60,
    participantCount: 62,
  },
  {
    id: 'sess-004',
    sectionLabel: 'CSE-B',
    subjectCode: '22CSPC206',
    subjectName: 'Operating Systems',
    facultyName: 'Prof. Vikram Sen',
    status: 'CLOSED',
    scheduledAt: 'Yesterday 14:00–15:00',
    durationMinutes: 60,
    participantCount: 59,
  },
];

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-001',
    senderName: 'System',
    senderRole: 'SYS_EVENT',
    content: '📌 Session opened — CSE-B / 22CSSPCDAA / Dr. A. Ramanathan · 09:00',
    timestamp: '09:00',
  },
  {
    id: 'msg-002',
    senderName: 'Dr. A. Ramanathan',
    senderRole: 'FACULTY',
    content:
      "Good morning class. Today we'll cover Module 4 — Graph Algorithms: BFS, DFS, and their applications. Please open the lecture notes shared last week. We'll start with a quick recap of Module 3 complexity bounds.",
    timestamp: '09:02',
  },
  {
    id: 'msg-003',
    senderName: 'HOD Office',
    senderRole: 'OFFICIAL_DIRECTIVE',
    content:
      '📋 OFFICIAL DIRECTIVE — All CIE-2 assessments must be conducted between 18 Nov – 22 Nov 2024. Faculty to coordinate with CR for hall booking. Time slots to be confirmed by 15 Nov.',
    timestamp: '09:05',
    pinned: true,
  },
  {
    id: 'msg-004',
    senderName: 'Aryan Rao (CR)',
    senderRole: 'CR',
    content:
      "Noted sir. I'll circulate the CIE-2 schedule to the section by EOD. Can we confirm PJ-301 for the DAA assessment on 20 Nov?",
    timestamp: '09:07',
  },
  {
    id: 'msg-005',
    senderName: 'Dr. A. Ramanathan',
    senderRole: 'FACULTY',
    content:
      'Yes, PJ-301 is confirmed. Please coordinate with the department office for the invigilator assignment. All materials for today\'s lecture are on the LMS under "Week 11 — Graph Algorithms".',
    timestamp: '09:10',
  },
  {
    id: 'msg-006',
    senderName: 'System',
    senderRole: 'SYS_EVENT',
    content: '⚠️ Timetable update: Dr. A. Ramanathan absent 14 Nov (medical). Proxy: Prof. S. Malathi.',
    timestamp: '09:15',
  },
  {
    id: 'msg-007',
    senderName: 'Aryan Rao (CR)',
    senderRole: 'CR',
    content: 'Understood. Will inform the section. Thanks for the advance notice.',
    timestamp: '09:16',
  },
];

const MOCK_DIRECTIVE: PinnedDirective = {
  id: 'dir-001',
  title: 'CIE-2 Assessment Window',
  content:
    'All Continuous Internal Evaluation — Cycle 2 assessments must be conducted between 18 Nov – 22 Nov 2024. Faculty are required to coordinate with Class Representatives for hall booking.',
  issuedBy: 'HOD Office — Dr. K. R. Suresh',
  issuedAt: '2024-11-13 09:05',
};

const roleBadge = (role: ChatMessage['senderRole']) => {
  const styles: Record<string, string> = {
    FACULTY: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
    CR: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    SYS_EVENT: 'bg-slate-100 text-slate-500 border border-slate-200',
    OFFICIAL_DIRECTIVE: 'bg-amber-100 text-amber-800 border border-amber-200',
  };
  const labels: Record<string, string> = {
    FACULTY: 'FACULTY',
    CR: 'CR',
    SYS_EVENT: 'SYSTEM',
    OFFICIAL_DIRECTIVE: 'OFFICIAL DIRECTIVE',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${styles[role]}`}>
      {labels[role]}
    </span>
  );
};

const statusColor = (s: ChatSession['status']) => {
  if (s === 'TODAY') return 'bg-emerald-100 text-emerald-700';
  if (s === 'UPCOMING') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-500';
};

export const ClassCommunicationCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>(MOCK_SESSIONS);
  const [activeSession, setActiveSession] = useState<ChatSession>(MOCK_SESSIONS[0]);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [muted, setMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canPost = currentUser.role === 'FACULTY' || currentUser.role === 'CR' || currentUser.role === 'DEPT_HEAD';
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Connect Socket.IO for live chamber messaging
    // Prioritize VITE_SOCKET_URL; for Vercel default to Render backend; for dev fallback to port 3001
    const defaultProdSocket = typeof window !== 'undefined' && window.location.origin.includes('vercel.app')
      ? 'https://campusflow-api.onrender.com'
      : '/';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV && typeof window !== 'undefined' && window.location.origin.includes('5173') ? 'http://localhost:3001' : defaultProdSocket);
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_chamber', activeSession.id);
    });

    socket.on('new_chamber_message', (payload: any) => {
      if (payload && payload.chamberId === activeSession.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeSession.id]);

  useEffect(() => {
    // Fetch sessions from API
    fetch(getApiUrl('/api/v1/class-sessions/active'))
      .then((r) => r.json())
      .then((r) => {
        if (r.data?.sessions?.length) setSessions(r.data.sessions);
      })
      .catch(() => {});
  }, []);

  const sendMessage = () => {
    if (!inputText.trim() || !canPost) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderName: currentUser.displayName,
      senderRole: currentUser.role === 'DEPT_HEAD' ? 'OFFICIAL_DIRECTIVE' : currentUser.role === 'FACULTY' ? 'FACULTY' : 'CR',
      content: inputText.trim(),
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // Emit live via Socket.IO
    if (socketRef.current) {
      socketRef.current.emit('send_chamber_message', {
        ...newMsg,
        chamberId: activeSession.id,
      });
    }

    // Post to API
    fetch(getApiUrl('/api/v1/class-sessions/messages'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: activeSession.id, content: newMsg.content }),
    }).catch(() => {});
  };

  // Countdown timer (mock)
  const [elapsed, setElapsed] = useState(18);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const remaining = activeSession.durationMinutes - elapsed;

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Left Sidebar — Session List */}
      <div className="w-72 border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-100 bg-[#0f172a]">
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <MessageSquare size={14} />
            Class Sessions
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">CSE-B · AY 2024–25 Odd Sem</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {(['TODAY', 'UPCOMING', 'CLOSED'] as const).map((status) => {
            const group = sessions.filter((s) => s.status === status);
            if (!group.length) return null;
            return (
              <div key={status}>
                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 tracking-wider border-b border-slate-100 bg-slate-50">
                  {status}
                </div>
                {group.map((sess) => (
                  <button
                    key={sess.id}
                    onClick={() => setActiveSession(sess)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      activeSession.id === sess.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-semibold text-slate-700">{sess.subjectCode}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${statusColor(sess.status)}`}>
                        {sess.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 font-medium leading-tight truncate">{sess.subjectName}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{sess.facultyName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock size={9} />
                      {sess.scheduledAt}
                    </p>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-[#0f172a] text-white px-5 py-3 flex items-center gap-4 border-b border-slate-700">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">{activeSession.subjectCode}</span>
              <ChevronRight size={12} className="text-slate-600" />
              <span className="text-sm font-bold truncate">{activeSession.subjectName}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Users size={10} />
                {activeSession.participantCount} participants
              </span>
              <span className="flex items-center gap-1">
                <Wifi size={10} className="text-emerald-400" />
                Live
              </span>
            </div>
          </div>
          {/* Countdown */}
          {activeSession.status === 'TODAY' && (
            <div className={`text-center px-3 py-1.5 rounded-lg ${remaining > 10 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
              <div className="text-lg font-bold font-mono">{Math.max(0, remaining)}</div>
              <div className="text-[9px] font-semibold tracking-wide">MIN LEFT</div>
            </div>
          )}
          <button onClick={() => setMuted(!muted)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            {muted ? <VolumeX size={16} className="text-slate-400" /> : <Volume2 size={16} className="text-slate-300" />}
          </button>
        </div>

        {/* Institutional Rule Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center gap-2 text-xs text-amber-800">
          <Shield size={12} className="text-amber-600 flex-shrink-0" />
          <span>
            <strong>Institutional Channel</strong> — All communications are logged and subject to BMSCE academic conduct policy.
            Only Faculty and CR may post. Students are in read-only mode.
          </span>
          <Lock size={10} className="ml-auto flex-shrink-0 text-amber-500" />
        </div>

        {/* Pinned Directive */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3">
          <div className="flex items-start gap-3">
            <Pin size={12} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold text-amber-800">{MOCK_DIRECTIVE.title}</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded font-bold">PINNED</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">{MOCK_DIRECTIVE.content}</p>
              <p className="text-[10px] text-amber-600 mt-1">
                Issued by {MOCK_DIRECTIVE.issuedBy} · {MOCK_DIRECTIVE.issuedAt}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#f8f9fb]">
          {messages.map((msg) => {
            if (msg.senderRole === 'SYS_EVENT') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-slate-200/80 text-slate-600 text-xs px-4 py-1.5 rounded-full font-medium">
                    {msg.content}
                  </div>
                </div>
              );
            }
            if (msg.senderRole === 'OFFICIAL_DIRECTIVE') {
              return (
                <div key={msg.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Megaphone size={14} className="text-amber-600" />
                    {roleBadge(msg.senderRole)}
                    <span className="text-xs text-slate-500">{msg.senderName} · {msg.timestamp}</span>
                  </div>
                  <p className="text-sm text-amber-900 leading-relaxed">{msg.content}</p>
                </div>
              );
            }
            return (
              <div key={msg.id} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  msg.senderRole === 'FACULTY' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {msg.senderName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-800">{msg.senderName}</span>
                    {roleBadge(msg.senderRole)}
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 leading-relaxed shadow-sm">
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer */}
        <div className="border-t border-slate-200 p-4 bg-white">
          {canPost ? (
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={`Post as ${currentUser.displayName} (${currentUser.role})…`}
                  rows={2}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputText.trim()}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 justify-center py-2 text-sm text-slate-500">
              <Lock size={14} />
              <span>Read-only — only Faculty and CR may post in this channel</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar — Governance */}
      <div className="w-64 border-l border-slate-200 flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Channel Governance</h3>
        </div>

        {/* Stakeholders */}
        <div className="p-4 border-b border-slate-100">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1">
            <Users size={10} />
            Stakeholders
          </h4>
          {[
            { name: 'Dr. A. Ramanathan', role: 'FACULTY', status: 'online' },
            { name: 'Aryan Rao', role: 'CR', status: 'online' },
            { name: 'Dr. K. R. Suresh', role: 'HOD', status: 'online' },
            { name: '59 Students', role: 'STUDENT', status: 'read-only' },
          ].map((s) => (
            <div key={s.name} className="flex items-center gap-2 py-1.5">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === 'online' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{s.name}</p>
                <p className="text-[10px] text-slate-400">{s.role} · {s.status}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Channel Rules */}
        <div className="p-4 border-b border-slate-100">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1">
            <BookOpen size={10} />
            Channel Rules
          </h4>
          <div className="space-y-2">
            {[
              'Faculty & CR may post; students read-only',
              'HOD directives are auto-pinned',
              'All messages are permanently logged',
              'No personal communications in class channel',
              'System events are automated — do not respond',
            ].map((rule, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{i + 1}.</span>
                <span className="text-[11px] text-slate-600 leading-snug">{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Ops */}
        <div className="p-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1">
            <AlertTriangle size={10} className="text-red-400" />
            Emergency Operations
          </h4>
          <div className="space-y-2">
            <button className="w-full text-left text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-3 py-2 transition-colors font-medium">
              🚨 Report Incident
            </button>
            <button className="w-full text-left text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 transition-colors font-medium">
              ⚠️ Raise Timetable Conflict
            </button>
            <button className="w-full text-left text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-2 transition-colors font-medium">
              📋 Request HOD Directive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

