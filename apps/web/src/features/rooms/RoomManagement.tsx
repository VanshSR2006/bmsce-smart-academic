import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import type { RoomInventoryItem, RoomsOverview } from '@bmsce/contracts';
import { useApiQuery } from '../../components/common/useApiQuery';
import { QueryStateCard } from '../../components/common/QueryStateCard';
import {
  MapPin,
  Filter,
  Search,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Monitor,
  Clock,
  Info,
} from 'lucide-react';

const roomsOverviewValidator: z.ZodType<RoomsOverview> = z.object({
  hasData: z.boolean(),
  isDemoData: z.boolean(),
  appliedFilters: z.object({
    departmentId: z.string().nullable(),
    academicTermId: z.string().nullable(),
  }),
  availableFilters: z.object({
    departments: z.array(z.object({ id: z.string(), code: z.string(), name: z.string() })),
    academicTerms: z.array(
      z.object({ id: z.string(), academicYearLabel: z.string(), termLabel: z.string() })
    ),
  }),
  scopeLabel: z.object({
    department: z.string(),
    academicTerm: z.string(),
  }),
  weeklyAvailablePeriods: z.number().int().nullable(),
  metrics: z.object({
    totalRooms: z.number().int(),
    activeRoomsCount: z.number().int(),
    classroomCount: z.number().int(),
    labCount: z.number().int(),
    otherRoomsCount: z.number().int(),
    avgUtilizationPct: z.number().nullable(),
    roomsWithSessionsCount: z.number().int(),
    unallocatedRoomsCount: z.number().int(),
    collisionCount: z.number().int(),
    capacityMismatchCount: z.number().int(),
  }),
  rooms: z.array(
    z.object({
      roomId: z.string(),
      roomCode: z.string(),
      name: z.string(),
      roomType: z.string(),
      capacity: z.number().int(),
      departmentId: z.string().nullable(),
      departmentName: z.string().nullable(),
      location: z.string().nullable(),
      isActive: z.boolean(),
      isLab: z.boolean(),
      facilities: z.array(z.string()),
      availabilityEntries: z.array(
        z.object({
          id: z.string(),
          availabilityType: z.string(),
          dayOfWeek: z.number().int().nullable(),
          startTime: z.string(),
          endTime: z.string(),
          reason: z.string().nullable(),
        })
      ),
      allocatedSessionsCount: z.number().int(),
      allocatedWeeklyHours: z.number().int(),
      freeWeeklyPeriods: z.number().int().nullable(),
      utilizationPct: z.number().nullable(),
      daySchedule: z.object({
        MON: z.number().int(),
        TUE: z.number().int(),
        WED: z.number().int(),
        THU: z.number().int(),
        FRI: z.number().int(),
      }),
      currentStatus: z.enum(['IN_USE', 'AVAILABLE', 'UNAVAILABLE']),
      collisionCount: z.number().int(),
      capacityMismatches: z.array(
        z.object({
          sectionCode: z.string(),
          expectedStudentCount: z.number().int(),
          roomCapacity: z.number().int(),
        })
      ),
      collisionStatus: z.enum(['CLEAN', 'COLLISION_ALERT']),
    })
  ),
  schemaLimitations: z.array(z.string()),
});

const DAY_NAMES: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

export const RoomManagement: React.FC = () => {
  const [departmentId, setDepartmentId] = useState('');
  const [academicTermId, setAcademicTermId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<RoomInventoryItem | null>(null);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (academicTermId) params.set('academicTermId', academicTermId);
    const qs = params.toString();
    return qs ? `/api/v1/rooms/overview?${qs}` : '/api/v1/rooms/overview';
  }, [departmentId, academicTermId]);

  const { data, loading, error, refetch } = useApiQuery<unknown>(endpoint);

  const parsed = useMemo(() => {
    if (!data) return null;
    return roomsOverviewValidator.safeParse(data);
  }, [data]);

  const overview = parsed?.success ? parsed.data : null;

  useEffect(() => {
    if (overview?.rooms?.length) {
      setSelectedRoom((prev) =>
        prev && overview.rooms.some((r) => r.roomId === prev.roomId)
          ? overview.rooms.find((r) => r.roomId === prev.roomId) ?? overview.rooms[0]
          : overview.rooms[0]
      );
    } else {
      setSelectedRoom(null);
    }
  }, [overview]);

  if (loading) {
    return (
      <QueryStateCard
        mode="loading"
        message="Loading smart labs and rooms..."
        spinnerColorClass="border-indigo-600"
      />
    );
  }

  if (error) {
    return (
      <QueryStateCard
        mode="error"
        title="Failed to Load Room Management"
        message={error}
        onRetry={refetch}
      />
    );
  }

  if (!overview) {
    return (
      <QueryStateCard
        mode="error"
        title="Invalid Room Inventory Payload"
        message="The server response did not match the expected room overview schema."
        onRetry={refetch}
      />
    );
  }

  const filteredRooms = overview.rooms.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.roomCode.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      (r.location ?? '').toLowerCase().includes(q);
    const matchesType = typeFilter === 'ALL' || r.roomType === typeFilter;
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: RoomInventoryItem['currentStatus']) => {
    switch (status) {
      case 'IN_USE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
            Allocated
          </span>
        );
      case 'AVAILABLE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Unallocated
          </span>
        );
      case 'UNAVAILABLE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Restricted
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0f172a] rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-medium">
              <span>{overview.scopeLabel.department}</span>
              <ChevronRight size={12} />
              <span>{overview.scopeLabel.academicTerm}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Classroom & Laboratory Infrastructure
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Database-backed Room, RoomFeature, RoomAvailability, and published TimetableSession
              metrics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white"
            >
              <option value="" className="text-slate-900">
                All Departments
              </option>
              {overview.availableFilters.departments.map((d) => (
                <option key={d.id} value={d.id} className="text-slate-900">
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
            <select
              value={academicTermId}
              onChange={(e) => setAcademicTermId(e.target.value)}
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white"
            >
              <option value="" className="text-slate-900">
                All Academic Terms
              </option>
              {overview.availableFilters.academicTerms.map((t) => (
                <option key={t.id} value={t.id} className="text-slate-900">
                  {t.academicYearLabel} ({t.termLabel})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Total Venues</div>
            <div className="text-xl font-bold text-white mt-1">{overview.metrics.totalRooms}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {overview.metrics.classroomCount} CR • {overview.metrics.labCount} Lab
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Average Utilization</div>
            <div className="text-xl font-bold text-indigo-300 mt-1">
              {overview.metrics.avgUtilizationPct !== null
                ? `${overview.metrics.avgUtilizationPct}%`
                : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {overview.weeklyAvailablePeriods !== null
                ? `${overview.weeklyAvailablePeriods} periods/wk`
                : 'No BellSchedule'}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">With Sessions</div>
            <div className="text-xl font-bold text-white mt-1">
              {overview.metrics.roomsWithSessionsCount}
            </div>
            <div className="text-[10px] text-indigo-300 mt-0.5">Published timetables</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Unallocated</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {overview.metrics.unallocatedRoomsCount}
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">0 published sessions</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Room Collisions</div>
            <div
              className={`text-xl font-bold mt-1 ${
                overview.metrics.collisionCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {overview.metrics.collisionCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {overview.metrics.collisionCount === 0 ? 'No overlaps' : 'Overlapping sessions'}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Cap. Mismatches</div>
            <div
              className={`text-xl font-bold mt-1 ${
                overview.metrics.capacityMismatchCount > 0 ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {overview.metrics.capacityMismatchCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Section &gt; capacity</div>
          </div>
        </div>
      </div>

      {!overview.hasData ? (
        <QueryStateCard
          mode="empty"
          title="No Rooms in Scope"
          message="No Room records matched the selected department filter."
          onRetry={refetch}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Room Inventory Table */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Filter rooms by code, name, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <Filter size={13} className="text-slate-400 mr-1" />
                    {['ALL', 'CLASSROOM', 'LAB', 'AUDITORIUM'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setTypeFilter(filter)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          typeFilter === filter
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[520px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold">
                        <th className="py-2.5 px-3">Room / Venue</th>
                        <th className="py-2.5 px-2">Type</th>
                        <th className="py-2.5 px-2">Capacity</th>
                        <th className="py-2.5 px-2">Weekly Load</th>
                        <th className="py-2.5 px-2">Utilization</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRooms.map((r) => {
                        const isSelected = selectedRoom?.roomId === r.roomId;
                        return (
                          <tr
                            key={r.roomId}
                            onClick={() => setSelectedRoom(r)}
                            className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                              isSelected ? 'bg-indigo-50/50' : ''
                            }`}
                          >
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                                  {r.roomCode}
                                </span>
                                <span>{r.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {r.location || r.departmentName || 'Location not specified'}
                              </div>
                            </td>

                            <td className="py-3 px-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  r.roomType === 'LAB'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}
                              >
                                {r.roomType}
                              </span>
                            </td>

                            <td className="py-3 px-2">
                              <div className="font-semibold text-slate-800">{r.capacity} Seats</div>
                              {r.capacityMismatches.length > 0 && (
                                <div className="text-[10px] text-amber-700 font-bold">
                                  {r.capacityMismatches.length} mismatch
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-2">
                              <div className="font-bold text-slate-800">
                                {r.allocatedWeeklyHours} Periods
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {r.allocatedSessionsCount} sessions
                              </div>
                            </td>

                            <td className="py-3 px-2">
                              {r.utilizationPct !== null ? (
                                <div className="w-20">
                                  <div className="text-[10px] font-medium text-slate-700 mb-0.5">
                                    {r.utilizationPct}%
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        r.utilizationPct >= 80
                                          ? 'bg-amber-500'
                                          : r.utilizationPct > 0
                                          ? 'bg-emerald-500'
                                          : 'bg-slate-300'
                                      }`}
                                      style={{ width: `${r.utilizationPct}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">N/A</span>
                              )}
                            </td>

                            <td className="py-3 px-3">{getStatusBadge(r.currentStatus)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Room Detail Inspector */}
            <div className="space-y-4">
              {selectedRoom ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {selectedRoom.roomCode}
                      </span>
                      {getStatusBadge(selectedRoom.currentStatus)}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5 leading-snug">
                      {selectedRoom.name}
                    </h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-slate-400" />
                      <span>
                        {selectedRoom.location || 'Location not specified'} • Cap:{' '}
                        {selectedRoom.capacity}
                      </span>
                    </div>
                  </div>

                  {/* Weekly Day Load Breakdown */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                      <span>Published Weekly Load</span>
                      <span className="text-indigo-600 font-extrabold">
                        {selectedRoom.allocatedWeeklyHours}
                        {overview.weeklyAvailablePeriods !== null
                          ? ` / ${overview.weeklyAvailablePeriods} Periods (${selectedRoom.utilizationPct}%)`
                          : ' Periods'}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 text-center">
                      {(['MON', 'TUE', 'WED', 'THU', 'FRI'] as const).map((day) => (
                        <div
                          key={day}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                        >
                          <div className="text-[10px] text-slate-400 font-medium">{day}</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">
                            {selectedRoom.daySchedule[day]}p
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Installed Features */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Monitor size={13} className="text-indigo-600" />
                      Linked Room Features ({selectedRoom.facilities.length})
                    </div>
                    {selectedRoom.facilities.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">
                        No RoomFeature records linked to this room.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRoom.facilities.map((fac, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg text-xs bg-slate-50 text-slate-700 border border-slate-200/80 font-medium"
                          >
                            {fac}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Room Availability Constraints */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Clock size={13} className="text-indigo-600" />
                      Room Availability ({selectedRoom.availabilityEntries.length})
                    </div>
                    {selectedRoom.availabilityEntries.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">
                        No RoomAvailability restrictions configured.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedRoom.availabilityEntries.map((av) => (
                          <div
                            key={av.id}
                            className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between"
                          >
                            <span>
                              {av.dayOfWeek
                                ? DAY_NAMES[av.dayOfWeek] || `Day ${av.dayOfWeek}`
                                : 'All Days'}{' '}
                              {av.startTime}–{av.endTime}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                              {av.availabilityType}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Collision & Capacity Check */}
                  <div
                    className={`rounded-xl p-3 flex items-start gap-2.5 border ${
                      selectedRoom.collisionStatus === 'CLEAN' &&
                      selectedRoom.capacityMismatches.length === 0
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-rose-50 border-rose-200'
                    }`}
                  >
                    {selectedRoom.collisionStatus === 'CLEAN' &&
                    selectedRoom.capacityMismatches.length === 0 ? (
                      <ShieldCheck size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle size={18} className="text-rose-600 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {selectedRoom.collisionStatus === 'CLEAN'
                          ? 'No Overlapping Sessions'
                          : `${selectedRoom.collisionCount} Time Overlap(s) Detected`}
                      </div>
                      <div className="text-[11px] text-slate-700 mt-0.5">
                        {selectedRoom.capacityMismatches.length === 0
                          ? 'All scheduled cohorts fit within room capacity.'
                          : `Capacity exceeded by: ${selectedRoom.capacityMismatches
                              .map((m) => `${m.sectionCode} (${m.expectedStudentCount}/${m.roomCapacity})`)
                              .join(', ')}`}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-xs">
                  Select a room to inspect allocation details.
                </div>
              )}
            </div>
          </div>

          {/* Schema Limitations */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
              <Info className="w-4 h-4 text-slate-500" />
              <span>Schema & Telemetry Notes</span>
            </div>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
              {overview.schemaLimitations.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};
