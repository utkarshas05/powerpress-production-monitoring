import React, { useEffect, useMemo, useState } from "react";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

import { ArrowLeft } from "lucide-react";

import {
    getMachine,
    getMachineRuntime,
} from "./api/api";


// =====================================================
// CONFIG
// =====================================================

const API_BASE_URL = "";

const INDIA_TIME_ZONE = "Asia/Kolkata";


// =====================================================
// API HELPER
// =====================================================

async function fetchJSON(url) {

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `API request failed: ${response.status}`
        );
    }

    return await response.json();
}


// =====================================================
// API FUNCTIONS
// =====================================================

async function getProduction(machineCode) {

    const data = await fetchJSON(
        `${API_BASE_URL}/api/machines/${encodeURIComponent(
            machineCode
        )}/production`
    );

    return data.production || [];
}


async function getDowntime(machineCode) {

    const data = await fetchJSON(
        `${API_BASE_URL}/api/machines/${encodeURIComponent(
            machineCode
        )}/downtime`
    );

    return data.downtime || [];
}


async function getEvents(machineCode) {

    const data = await fetchJSON(
        `${API_BASE_URL}/api/machines/${encodeURIComponent(
            machineCode
        )}/events`
    );

    return data.events || [];
}


// =====================================================
// DATE / TIME HELPERS
// =====================================================

function getIndiaDateParts(date = new Date()) {

    const parts = new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: INDIA_TIME_ZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }
    ).formatToParts(date);


    const values = {};


    parts.forEach((part) => {

        if (part.type !== "literal") {
            values[part.type] = part.value;
        }

    });


    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
    };
}


// =====================================================
// INDIA START OF TODAY
// =====================================================

function getIndiaStartOfToday(
    referenceDate = new Date()
) {

    const {
        year,
        month,
        day,
    } = getIndiaDateParts(referenceDate);


    return new Date(
        `${year}-${String(month).padStart(
            2,
            "0"
        )}-${String(day).padStart(
            2,
            "0"
        )}T00:00:00+05:30`
    );
}


// =====================================================
// FORMAT TIME IN INDIA
// =====================================================

function formatTime(value) {

    if (!value) {
        return "--:--";
    }


    const date = new Date(value);


    if (Number.isNaN(date.getTime())) {
        return "--:--";
    }


    return new Intl.DateTimeFormat(
        "en-IN",
        {
            timeZone: INDIA_TIME_ZONE,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }
    ).format(date);
}


// =====================================================
// FORMAT DURATION
// =====================================================

function formatDuration(seconds) {

    const totalSeconds =
        Math.max(
            0,
            Math.floor(
                Number(seconds) || 0
            )
        );


    const hours =
        Math.floor(
            totalSeconds / 3600
        );


    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        );


    const secs =
        totalSeconds % 60;


    if (hours > 0) {

        return (
            `${String(hours).padStart(2, "0")}:` +
            `${String(minutes).padStart(2, "0")}:` +
            `${String(secs).padStart(2, "0")}`
        );

    }


    return (
        `${String(minutes).padStart(2, "0")}:` +
        `${String(secs).padStart(2, "0")}`
    );
}


// =====================================================
// OVERLAP CALCULATION
// =====================================================

function getOverlapSeconds(
    intervalStart,
    intervalEnd,
    rangeStart,
    rangeEnd
) {

    if (
        !intervalStart ||
        !intervalEnd ||
        !rangeStart ||
        !rangeEnd
    ) {
        return 0;
    }


    const start =
        Math.max(
            intervalStart.getTime(),
            rangeStart.getTime()
        );


    const end =
        Math.min(
            intervalEnd.getTime(),
            rangeEnd.getTime()
        );


    if (end <= start) {
        return 0;
    }


    return (
        (end - start) / 1000
    );
}


// =====================================================
// BUILD MACHINE STATE INTERVALS
//
// Production Pulse
//      ↓
// RUNNING
//
// Downtime Started
//      ↓
// DOWNTIME
//
// Downtime Ended
//      ↓
// RUNNING
// =====================================================

function buildStateIntervals(
    events,
    now = new Date()
) {

    const sortedEvents =
        [...events]
            .filter(
                (event) =>
                    event.event_time
            )
            .map(
                (event) => ({
                    ...event,
                    parsedTime:
                        new Date(
                            event.event_time
                        ),
                })
            )
            .filter(
                (event) =>
                    !Number.isNaN(
                        event.parsedTime.getTime()
                    )
            )
            .sort(
                (a, b) =>
                    a.parsedTime.getTime() -
                    b.parsedTime.getTime()
            );


    const runningIntervals = [];

    const downtimeIntervals = [];


    let currentState = null;

    let stateStart = null;


    for (
        const event of sortedEvents
    ) {

        const eventType =
            event.event_type;

        const eventTime =
            event.parsedTime;


        // ---------------------------------------------
        // PRODUCTION PULSE
        // ---------------------------------------------

        if (
            eventType ===
            "Production Pulse"
        ) {

            if (
                currentState !==
                "RUNNING"
            ) {

                if (
                    currentState ===
                        "DOWNTIME" &&
                    stateStart
                ) {

                    downtimeIntervals.push({
                        start:
                            stateStart,
                        end:
                            eventTime,
                    });

                }


                currentState =
                    "RUNNING";

                stateStart =
                    eventTime;

            }

            continue;
        }


        // ---------------------------------------------
        // DOWNTIME STARTED
        // ---------------------------------------------

        if (
            eventType ===
            "Downtime Started"
        ) {

            if (
                currentState ===
                    "RUNNING" &&
                stateStart
            ) {

                runningIntervals.push({
                    start:
                        stateStart,
                    end:
                        eventTime,
                });

            }


            currentState =
                "DOWNTIME";

            stateStart =
                eventTime;

            continue;
        }


        // ---------------------------------------------
        // DOWNTIME ENDED
        // ---------------------------------------------

        if (
            eventType ===
            "Downtime Ended"
        ) {

            if (
                currentState ===
                    "DOWNTIME" &&
                stateStart
            ) {

                downtimeIntervals.push({
                    start:
                        stateStart,
                    end:
                        eventTime,
                });

            }


            currentState =
                "RUNNING";

            stateStart =
                eventTime;
        }

    }


    // ---------------------------------------------
    // CURRENT OPEN STATE
    // ---------------------------------------------

    if (
        stateStart &&
        currentState ===
            "RUNNING"
    ) {

        runningIntervals.push({
            start:
                stateStart,
            end:
                now,
        });

    }


    if (
        stateStart &&
        currentState ===
            "DOWNTIME"
    ) {

        downtimeIntervals.push({
            start:
                stateStart,
            end:
                now,
        });

    }


    return {
        runningIntervals,
        downtimeIntervals,
    };
}


// =====================================================
// TODAY'S ACTUAL DOWNTIME
//
// IMPORTANT:
// Uses downtime_records directly.
//
// If a downtime record is still open,
// runtime.downtime_start is also included.
// =====================================================

function calculateTodayDowntime(
    downtimeRecords,
    runtime,
    now
) {

    const today =
        getIndiaStartOfToday(now);


    let totalSeconds = 0;


    // ---------------------------------------------
    // CLOSED DOWNTIME RECORDS
    // ---------------------------------------------

    for (
        const record of downtimeRecords
    ) {

        if (!record.start_time) {
            continue;
        }


        const start =
            new Date(
                record.start_time
            );


        if (
            Number.isNaN(
                start.getTime()
            )
        ) {
            continue;
        }


        let end;


        if (record.end_time) {

            end =
                new Date(
                    record.end_time
                );

        } else {

            end = now;

        }


        if (
            Number.isNaN(
                end.getTime()
            )
        ) {
            continue;
        }


        totalSeconds +=
            getOverlapSeconds(
                start,
                end,
                today,
                now
            );

    }


    // ---------------------------------------------
    // OPEN CURRENT DOWNTIME
    //
    // Only add this when the backend runtime
    // explicitly says the machine is in DOWNTIME.
    //
    // This prevents counting old/duplicate data.
    // ---------------------------------------------

    if (
        runtime?.current_status ===
            "DOWNTIME" &&
        runtime?.downtime_start
    ) {

        const openStart =
            new Date(
                runtime.downtime_start
            );


        if (
            !Number.isNaN(
                openStart.getTime()
            )
        ) {

            // Check whether this open downtime is
            // already represented by a database record.
            const alreadyRecorded =
                downtimeRecords.some(
                    (record) => {

                        if (
                            !record.start_time
                        ) {
                            return false;
                        }


                        const recordStart =
                            new Date(
                                record.start_time
                            );


                        if (
                            Number.isNaN(
                                recordStart.getTime()
                            )
                        ) {
                            return false;
                        }


                        return (
                            Math.abs(
                                recordStart.getTime() -
                                openStart.getTime()
                            ) < 2000 &&
                            !record.end_time
                        );

                    }
                );


            if (!alreadyRecorded) {

                totalSeconds +=
                    getOverlapSeconds(
                        openStart,
                        now,
                        today,
                        now
                    );

            }

        }

    }


    return Math.max(
        0,
        totalSeconds
    );
}


// =====================================================
// TODAY'S RUNNING TIME
//
// Running time is calculated from actual
// Production Pulse → RUNNING state intervals.
//
// IMPORTANT:
// If there is NO production pulse today,
// uptime is ZERO.
//
// This prevents fake uptime accumulation.
// =====================================================

function calculateTodayUptime(
    runningIntervals,
    events,
    today,
    now
) {

    const todayPulses =
        events
            .filter(
                (event) =>
                    event.event_type ===
                        "Production Pulse" &&
                    event.event_time
            )
            .map(
                (event) =>
                    new Date(
                        event.event_time
                    )
            )
            .filter(
                (date) =>
                    !Number.isNaN(
                        date.getTime()
                    ) &&
                    date >= today &&
                    date <= now
            )
            .sort(
                (a, b) =>
                    a.getTime() -
                    b.getTime()
            );


    // ---------------------------------------------
    // NO PULSE TODAY
    // ---------------------------------------------

    if (
        todayPulses.length === 0
    ) {

        return 0;

    }


    const firstPulse =
        todayPulses[0];


    let totalSeconds = 0;


    for (
        const interval of
        runningIntervals
    ) {

        const effectiveStart =
            new Date(
                Math.max(
                    interval.start.getTime(),
                    firstPulse.getTime(),
                    today.getTime()
                )
            );


        const effectiveEnd =
            new Date(
                Math.min(
                    interval.end.getTime(),
                    now.getTime()
                )
            );


        if (
            effectiveEnd >
            effectiveStart
        ) {

            totalSeconds +=
                (
                    effectiveEnd.getTime() -
                    effectiveStart.getTime()
                ) / 1000;

        }

    }


    return Math.max(
        0,
        totalSeconds
    );
}


// =====================================================
// HOURLY GRAPH
//
// Shows actual known machine state.
//
// Uptime = actual RUNNING time
// Downtime = actual DOWNTIME time
//
// Unknown time = 0 / 0
// =====================================================

function buildHourlyGraph(
    runningIntervals,
    downtimeIntervals,
    events
) {

    const now =
        new Date();


    const today =
        getIndiaStartOfToday(now);


    const indiaParts =
        getIndiaDateParts(now);


    const currentHour =
        Number(
            new Intl.DateTimeFormat(
                "en-IN",
                {
                    timeZone:
                        INDIA_TIME_ZONE,
                    hour:
                        "2-digit",
                    hour12:
                        false,
                }
            ).format(now)
        );


    const todayPulses =
        events
            .filter(
                (event) =>
                    event.event_type ===
                        "Production Pulse" &&
                    event.event_time
            )
            .map(
                (event) =>
                    new Date(
                        event.event_time
                    )
            )
            .filter(
                (date) =>
                    !Number.isNaN(
                        date.getTime()
                    ) &&
                    date >= today &&
                    date <= now
            )
            .sort(
                (a, b) =>
                    a.getTime() -
                    b.getTime()
            );


    const firstPulse =
        todayPulses.length > 0
            ? todayPulses[0]
            : null;


    const hours = [];


    for (
        let hour = 0;
        hour <= currentHour;
        hour++
    ) {

        const hourStart =
            new Date(
                `${indiaParts.year}-${String(
                    indiaParts.month
                ).padStart(
                    2,
                    "0"
                )}-${String(
                    indiaParts.day
                ).padStart(
                    2,
                    "0"
                )}T${String(
                    hour
                ).padStart(
                    2,
                    "0"
                )}:00:00+05:30`
            );


        const hourEnd =
            new Date(
                hourStart.getTime() +
                    60 * 60 * 1000
            );


        const effectiveEnd =
            new Date(
                Math.min(
                    hourEnd.getTime(),
                    now.getTime()
                )
            );


        if (
            effectiveEnd <=
            hourStart ||
            !firstPulse
        ) {

            hours.push({
                hour:
                    `${String(
                        hour
                    ).padStart(
                        2,
                        "0"
                    )}:00`,
                uptime: 0,
                downtime: 0,
            });

            continue;
        }


        let runningSeconds = 0;

        let downtimeSeconds = 0;


        for (
            const interval of
            runningIntervals
        ) {

            const start =
                new Date(
                    Math.max(
                        interval.start.getTime(),
                        firstPulse.getTime()
                    )
                );


            runningSeconds +=
                getOverlapSeconds(
                    start,
                    interval.end,
                    hourStart,
                    effectiveEnd
                );

        }


        for (
            const interval of
            downtimeIntervals
        ) {

            downtimeSeconds +=
                getOverlapSeconds(
                    interval.start,
                    interval.end,
                    hourStart,
                    effectiveEnd
                );

        }


        const knownSeconds =
            runningSeconds +
            downtimeSeconds;


        let uptimePercent = 0;

        let downtimePercent = 0;


        if (
            knownSeconds > 0
        ) {

            uptimePercent =
                (
                    runningSeconds /
                    knownSeconds
                ) * 100;


            downtimePercent =
                (
                    downtimeSeconds /
                    knownSeconds
                ) * 100;

        }


        hours.push({

            hour:
                `${String(
                    hour
                ).padStart(
                    2,
                    "0"
                )}:00`,

            uptime:
                Number(
                    uptimePercent.toFixed(1)
                ),

            downtime:
                Number(
                    downtimePercent.toFixed(1)
                ),

        });

    }


    return hours;
}


// =====================================================
// TOOLTIP
// =====================================================

function ActivityTooltip({
    active,
    payload,
    label,
}) {

    if (
        !active ||
        !payload ||
        payload.length === 0
    ) {

        return null;

    }


    return (

        <div
            style={{
                background:
                    "#ffffff",
                border:
                    "1px solid #dbe3ef",
                borderRadius:
                    "10px",
                padding:
                    "12px 15px",
                boxShadow:
                    "0 8px 25px rgba(15,23,42,0.12)",
                minWidth:
                    "160px",
            }}
        >

            <div
                style={{
                    fontWeight:
                        700,
                    marginBottom:
                        "8px",
                    color:
                        "#111827",
                }}
            >
                {label}
            </div>


            {payload.map(
                (item) => (

                    <div
                        key={
                            item.dataKey
                        }
                        style={{
                            display:
                                "flex",
                            justifyContent:
                                "space-between",
                            gap:
                                "20px",
                            marginTop:
                                "5px",
                            fontSize:
                                "13px",
                        }}
                    >

                        <span
                            style={{
                                color:
                                    item.dataKey ===
                                    "uptime"
                                        ? "#16a34a"
                                        : "#dc2626",
                                fontWeight:
                                    600,
                            }}
                        >

                            {item.dataKey ===
                            "uptime"
                                ? "Uptime"
                                : "Downtime"}

                        </span>


                        <strong>
                            {item.value}%
                        </strong>

                    </div>

                )
            )}

        </div>

    );

}


// =====================================================
// MAIN COMPONENT
// =====================================================

export default function MachineDashboard({
    machine: selectedMachine,
    onBack,
}) {

    const [machine, setMachine] =
        useState(
            selectedMachine
        );


    const [runtime, setRuntime] =
        useState(null);


    const [production, setProduction] =
        useState([]);


    const [downtime, setDowntime] =
        useState([]);


    const [events, setEvents] =
        useState([]);


    const [loading, setLoading] =
        useState(true);


    const [error, setError] =
        useState(null);


    // =================================================
    // UPDATE SELECTED MACHINE
    // =================================================

    useEffect(() => {

        setMachine(
            selectedMachine
        );

    }, [selectedMachine]);


    // =================================================
    // MACHINE CODE
    // =================================================

    const machineCode =
        machine?.machineCode ||
        machine?.machine_code;


    // =================================================
    // LOAD DATA
    // =================================================

    useEffect(() => {

        if (!machineCode) {
            return;
        }


        let cancelled = false;


        async function loadData() {

            try {

                setError(null);


                const [
                    runtimeData,
                    productionData,
                    downtimeData,
                    eventsData,
                ] =
                    await Promise.all([

                        getMachineRuntime(
                            machineCode
                        ),

                        getProduction(
                            machineCode
                        ),

                        getDowntime(
                            machineCode
                        ),

                        getEvents(
                            machineCode
                        ),

                    ]);


                if (
                    cancelled
                ) {
                    return;
                }


                setRuntime(
                    runtimeData
                );


                setProduction(
                    productionData
                );


                setDowntime(
                    downtimeData
                );


                setEvents(
                    eventsData
                );


                try {

                    const latestMachine =
                        await getMachine(
                            machineCode
                        );


                    if (
                        !cancelled &&
                        latestMachine
                    ) {

                        setMachine(
                            latestMachine
                        );

                    }

                } catch (
                    machineError
                ) {

                    console.warn(
                        "Machine refresh failed:",
                        machineError
                    );

                }


                setLoading(
                    false
                );

            } catch (err) {

                console.error(
                    "Machine dashboard error:",
                    err
                );


                if (
                    !cancelled
                ) {

                    setError(
                        err.message
                    );


                    setLoading(
                        false
                    );

                }

            }

        }


        loadData();


        const interval =
            setInterval(
                loadData,
                5000
            );


        return () => {

            cancelled = true;

            clearInterval(
                interval
            );

        };

    }, [machineCode]);


    // =================================================
    // CURRENT TIME
    //
    // Re-renders every second so an active
    // downtime/running interval updates live.
    // =================================================

    const [currentTime, setCurrentTime] =
        useState(
            new Date()
        );


    useEffect(() => {

        const timer =
            setInterval(
                () => {
                    setCurrentTime(
                        new Date()
                    );
                },
                1000
            );


        return () =>
            clearInterval(timer);

    }, []);


    // =================================================
    // ACTUAL MACHINE STATES
    // =================================================

    const stateIntervals =
        useMemo(
            () =>
                buildStateIntervals(
                    events,
                    currentTime
                ),
            [
                events,
                currentTime,
            ]
        );


    const runningIntervals =
        stateIntervals.runningIntervals;


    const downtimeIntervals =
        stateIntervals.downtimeIntervals;


    // =================================================
    // TODAY
    // =================================================

    const today =
        useMemo(
            () =>
                getIndiaStartOfToday(
                    currentTime
                ),
            [currentTime]
        );


    // =================================================
    // TODAY'S PRODUCTION
    // =================================================

    const todayProduction =
        useMemo(() => {

            return production.reduce(
                (
                    total,
                    record
                ) => {

                    if (
                        !record.timestamp
                    ) {
                        return total;
                    }


                    const timestamp =
                        new Date(
                            record.timestamp
                        );


                    if (
                        Number.isNaN(
                            timestamp.getTime()
                        )
                    ) {
                        return total;
                    }


                    if (
                        timestamp >=
                        today &&
                        timestamp <=
                        currentTime
                    ) {

                        return (
                            total +
                            (
                                Number(
                                    record.cycle_count
                                ) || 0
                            )
                        );

                    }


                    return total;

                },
                0
            );

        }, [
            production,
            today,
            currentTime,
        ]);


    // =================================================
    // TODAY'S DOWNTIME
    // =================================================

    const todayDowntimeSeconds =
        useMemo(() => {

            return calculateTodayDowntime(
                downtime,
                runtime,
                currentTime
            );

        }, [
            downtime,
            runtime,
            currentTime,
        ]);


    // =================================================
    // TODAY'S UPTIME
    // =================================================

    const todayUptimeSeconds =
        useMemo(() => {

            return calculateTodayUptime(
                runningIntervals,
                events,
                today,
                currentTime
            );

        }, [
            runningIntervals,
            events,
            today,
            currentTime,
        ]);


    // =================================================
    // MONITORED TIME
    //
    // ONLY actual known machine time.
    // =================================================

    const monitoredTimeSeconds =
        todayUptimeSeconds +
        todayDowntimeSeconds;


    // =================================================
    // AVAILABILITY
    //
    // Actual uptime / actual monitored time
    // =================================================

    const uptimePercent =
        monitoredTimeSeconds > 0
            ? (
                  todayUptimeSeconds /
                  monitoredTimeSeconds
              ) * 100
            : 0;


    // =================================================
    // JOBS / MINUTE
    // =================================================

    const jobsPerMinute =
        useMemo(() => {

            const values =
                production
                    .filter(
                        (item) =>
                            item.jobs_per_minute !==
                                undefined &&
                            item.jobs_per_minute !==
                                null
                    )
                    .map(
                        (item) =>
                            Number(
                                item.jobs_per_minute
                            )
                    )
                    .filter(
                        (value) =>
                            !Number.isNaN(
                                value
                            )
                    );


            if (
                values.length === 0
            ) {

                return 0;

            }


            return values[
                values.length - 1
            ];

        }, [production]);


    // =================================================
    // STATUS
    // =================================================

    const currentStatus =
        runtime?.current_status ||
        "OFFLINE";


    const isRunning =
        currentStatus ===
        "RUNNING";


    const isDowntime =
        currentStatus ===
        "DOWNTIME";


    // =================================================
    // LAST PULSE
    // =================================================

    const lastPulse =
        runtime?.last_pulse_time
            ? formatTime(
                  runtime.last_pulse_time
              )
            : "--:--";


    // =================================================
    // LOADING
    // =================================================

    if (
        loading &&
        !runtime
    ) {

        return (

            <div
                style={{
                    padding:
                        "40px",
                    textAlign:
                        "center",
                    color:
                        "#64748b",
                }}
            >

                Loading machine data...

            </div>

        );

    }


    // =================================================
    // ERROR
    // =================================================

    if (
        error &&
        !runtime
    ) {

        return (

            <div
                style={{
                    padding:
                        "40px",
                    color:
                        "#dc2626",
                }}
            >

                <h2>
                    Unable to load machine data
                </h2>


                <p>
                    {error}
                </p>


                <button
                    onClick={onBack}
                    type="button"
                    style={{
                        marginTop:
                            "15px",
                        display:
                            "inline-flex",
                        alignItems:
                            "center",
                        gap:
                            "7px",
                        padding:
                            "9px 14px",
                        border:
                            "1px solid #dbe3ef",
                        borderRadius:
                            "8px",
                        background:
                            "#ffffff",
                        color:
                            "#2563eb",
                        fontWeight:
                            600,
                        cursor:
                            "pointer",
                    }}
                >

                    <ArrowLeft
                        size={16}
                    />

                    Back to Machines

                </button>

            </div>

        );

    }


    // =================================================
    // GRAPH
    // =================================================

    const graphData =
        buildHourlyGraph(
            runningIntervals,
            downtimeIntervals,
            events
        );


    // =================================================
    // RENDER
    // =================================================

    return (

        <div
            style={{
                padding:
                    "30px 42px",
                background:
                    "#f8fafc",
                minHeight:
                    "100vh",
            }}
        >

            {/* =========================================
                HEADER
            ========================================= */}

            <div
                style={{
                    marginBottom:
                        "25px",
                }}
            >

                <button
                    onClick={onBack}
                    type="button"
                    style={{
                        display:
                            "inline-flex",
                        alignItems:
                            "center",
                        gap:
                            "7px",
                        marginBottom:
                            "18px",
                        padding:
                            "8px 13px",
                        border:
                            "1px solid #dbe3ef",
                        borderRadius:
                            "8px",
                        background:
                            "#ffffff",
                        color:
                            "#2563eb",
                        fontSize:
                            "13px",
                        fontWeight:
                            600,
                        cursor:
                            "pointer",
                        boxShadow:
                            "0 1px 3px rgba(15,23,42,0.05)",
                    }}
                >

                    <ArrowLeft
                        size={16}
                    />

                    Back to Machines

                </button>


                <div
                    style={{
                        fontSize:
                            "14px",
                        fontWeight:
                            700,
                        color:
                            "#2563eb",
                        letterSpacing:
                            "1.5px",
                        textTransform:
                            "uppercase",
                        marginBottom:
                            "8px",
                    }}
                >
                    Production Monitoring
                </div>


                <h1
                    style={{
                        margin:
                            0,
                        fontSize:
                            "38px",
                        color:
                            "#0f172a",
                    }}
                >
                    {machine?.machineName ||
                        machine?.machine_name ||
                        "Machine"}
                </h1>


                <p
                    style={{
                        marginTop:
                            "7px",
                        color:
                            "#64748b",
                        fontSize:
                            "16px",
                    }}
                >

                    {machine?.machineCode ||
                        machine?.machine_code ||
                        "--"}

                    {" • "}

                    {machine?.machineType ||
                        machine?.machine_type ||
                        "Machine"}

                </p>

            </div>


            {/* =========================================
                MACHINE STATUS
            ========================================= */}

            <div
                style={{
                    background:
                        "#ffffff",
                    border:
                        "1px solid #e2e8f0",
                    borderRadius:
                        "16px",
                    padding:
                        "25px 30px",
                    display:
                        "flex",
                    justifyContent:
                        "space-between",
                    alignItems:
                        "center",
                    marginBottom:
                        "25px",
                    boxShadow:
                        "0 3px 12px rgba(15,23,42,0.04)",
                }}
            >

                <div>

                    <div
                        style={{
                            color:
                                "#64748b",
                            fontSize:
                                "13px",
                            fontWeight:
                                700,
                            letterSpacing:
                                "1.2px",
                            marginBottom:
                                "8px",
                        }}
                    >
                        MACHINE STATUS
                    </div>


                    <div
                        style={{
                            display:
                                "flex",
                            alignItems:
                                "center",
                            gap:
                                "10px",
                            fontSize:
                                "28px",
                            fontWeight:
                                800,
                            color:
                                isRunning
                                    ? "#16a34a"
                                    : isDowntime
                                    ? "#dc2626"
                                    : "#64748b",
                        }}
                    >

                        <span>
                            ●
                        </span>

                        {currentStatus}

                    </div>

                </div>


                <div
                    style={{
                        textAlign:
                            "right",
                    }}
                >

                    <div
                        style={{
                            fontSize:
                                "12px",
                            fontWeight:
                                700,
                            color:
                                "#94a3b8",
                            letterSpacing:
                                "1px",
                        }}
                    >
                        LAST PULSE
                    </div>


                    <div
                        style={{
                            marginTop:
                                "5px",
                            fontSize:
                                "22px",
                            fontWeight:
                                800,
                            color:
                                "#0f172a",
                        }}
                    >
                        {lastPulse}
                    </div>


                    <div
                        style={{
                            fontSize:
                                "12px",
                            color:
                                "#94a3b8",
                        }}
                    >
                        India time
                    </div>

                </div>

            </div>


            {/* =========================================
                SUMMARY CARDS
            ========================================= */}

            <div
                style={{
                    display:
                        "grid",
                    gridTemplateColumns:
                        "repeat(4, minmax(0, 1fr))",
                    gap:
                        "18px",
                    marginBottom:
                        "25px",
                }}
            >

                <SummaryCard
                    title="Today's Production"
                    value={todayProduction.toLocaleString()}
                    subtitle="Total press cycles"
                    valueColor="#0f172a"
                />


                <SummaryCard
                    title="Jobs / Minute"
                    value={jobsPerMinute.toFixed(1)}
                    subtitle="Current production rate"
                    valueColor="#0f172a"
                />


                <SummaryCard
                    title="Today's Uptime"
                    value={formatDuration(
                        todayUptimeSeconds
                    )}
                    subtitle={`${uptimePercent.toFixed(
                        1
                    )}% availability`}
                    valueColor="#16a34a"
                />


                <SummaryCard
                    title="Today's Downtime"
                    value={formatDuration(
                        todayDowntimeSeconds
                    )}
                    subtitle="Machine idle time"
                    valueColor="#dc2626"
                />

            </div>


            {/* =========================================
                GRAPH
            ========================================= */}

            <div
                style={{
                    background:
                        "#ffffff",
                    border:
                        "1px solid #e2e8f0",
                    borderRadius:
                        "16px",
                    padding:
                        "25px 25px 20px",
                    marginBottom:
                        "25px",
                    boxShadow:
                        "0 3px 12px rgba(15,23,42,0.04)",
                }}
            >

                <div
                    style={{
                        display:
                            "flex",
                        justifyContent:
                            "space-between",
                        alignItems:
                            "flex-start",
                        marginBottom:
                            "20px",
                    }}
                >

                    <div>

                        <h2
                            style={{
                                margin:
                                    0,
                                color:
                                    "#0f172a",
                                fontSize:
                                    "23px",
                            }}
                        >
                            Machine Activity
                        </h2>


                        <p
                            style={{
                                margin:
                                    "5px 0 0",
                                color:
                                    "#64748b",
                                fontSize:
                                    "14px",
                            }}
                        >
                            Today's actual machine state
                        </p>

                    </div>


                    <div
                        style={{
                            fontSize:
                                "13px",
                            color:
                                "#64748b",
                            padding:
                                "7px 12px",
                            border:
                                "1px solid #e2e8f0",
                            borderRadius:
                                "8px",
                        }}
                    >
                        Today • IST
                    </div>

                </div>


                <div
                    style={{
                        width:
                            "100%",
                        height:
                            "360px",
                    }}
                >

                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                    >

                        <LineChart
                            data={
                                graphData
                            }
                            margin={{
                                top:
                                    15,
                                right:
                                    20,
                                left:
                                    5,
                                bottom:
                                    10,
                            }}
                        >

                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e2e8f0"
                                vertical={false}
                            />


                            <XAxis
                                dataKey="hour"
                                tick={{
                                    fill:
                                        "#64748b",
                                    fontSize:
                                        12,
                                }}
                                tickLine={false}
                                axisLine={{
                                    stroke:
                                        "#cbd5e1",
                                }}
                            />


                            <YAxis
                                domain={[
                                    0,
                                    100,
                                ]}
                                ticks={[
                                    0,
                                    20,
                                    40,
                                    60,
                                    80,
                                    100,
                                ]}
                                tickFormatter={(
                                    value
                                ) =>
                                    `${value}%`
                                }
                                tick={{
                                    fill:
                                        "#64748b",
                                    fontSize:
                                        12,
                                }}
                                tickLine={false}
                                axisLine={false}
                            />


                            <Tooltip
                                content={
                                    <ActivityTooltip />
                                }
                            />


                            <Legend
                                verticalAlign="bottom"
                                height={35}
                                iconType="line"
                                wrapperStyle={{
                                    fontSize:
                                        "13px",
                                    color:
                                        "#64748b",
                                }}
                            />


                            <Line
                                type="monotone"
                                dataKey="uptime"
                                name="Uptime"
                                stroke="#16a34a"
                                strokeWidth={3}
                                dot={{
                                    r:
                                        4,
                                    fill:
                                        "#ffffff",
                                    stroke:
                                        "#16a34a",
                                    strokeWidth:
                                        2,
                                }}
                                activeDot={{
                                    r:
                                        6,
                                    stroke:
                                        "#16a34a",
                                    strokeWidth:
                                        2,
                                    fill:
                                        "#ffffff",
                                }}
                            />


                            <Line
                                type="monotone"
                                dataKey="downtime"
                                name="Downtime"
                                stroke="#dc2626"
                                strokeWidth={3}
                                dot={{
                                    r:
                                        4,
                                    fill:
                                        "#ffffff",
                                    stroke:
                                        "#dc2626",
                                    strokeWidth:
                                        2,
                                }}
                                activeDot={{
                                    r:
                                        6,
                                    stroke:
                                        "#dc2626",
                                    strokeWidth:
                                        2,
                                    fill:
                                        "#ffffff",
                                }}
                            />

                        </LineChart>

                    </ResponsiveContainer>

                </div>

            </div>


            {/* =========================================
                LOWER SECTION
            ========================================= */}

            <div
                style={{
                    display:
                        "grid",
                    gridTemplateColumns:
                        "1.1fr 0.9fr",
                    gap:
                        "25px",
                }}
            >

                {/* MACHINE INFORMATION */}

                <div
                    style={{
                        background:
                            "#ffffff",
                        border:
                            "1px solid #e2e8f0",
                        borderRadius:
                            "16px",
                        padding:
                            "25px",
                    }}
                >

                    <h2
                        style={{
                            margin:
                                "0 0 5px",
                            fontSize:
                                "22px",
                            color:
                                "#0f172a",
                        }}
                    >
                        Machine Information
                    </h2>


                    <p
                        style={{
                            margin:
                                "0 0 20px",
                            color:
                                "#64748b",
                            fontSize:
                                "14px",
                        }}
                    >
                        Machine and device
                        configuration
                    </p>


                    <div
                        style={{
                            display:
                                "grid",
                            gridTemplateColumns:
                                "1fr 1fr",
                            gap:
                                "14px",
                        }}
                    >

                        <InfoBox
                            label="MACHINE CODE"
                            value={
                                machine?.machineCode ||
                                machine?.machine_code ||
                                "--"
                            }
                        />


                        <InfoBox
                            label="MACHINE NAME"
                            value={
                                machine?.machineName ||
                                machine?.machine_name ||
                                "--"
                            }
                        />


                        <InfoBox
                            label="MACHINE TYPE"
                            value={
                                machine?.machineType ||
                                machine?.machine_type ||
                                "--"
                            }
                        />


                        <InfoBox
                            label="INPUT TYPE"
                            value={
                                machine?.inputType ||
                                machine?.input_type ||
                                "Pulse"
                            }
                        />


                        <InfoBox
                            label="ESP DEVICE"
                            value={
                                machine?.deviceId ||
                                machine?.device_id ||
                                runtime?.device_id ||
                                "--"
                            }
                        />


                        <InfoBox
                            label="CONNECTION"
                            value={
                                runtime?.last_pulse_time
                                    ? "Connected"
                                    : "Disconnected"
                            }
                        />

                    </div>

                </div>


                {/* RECENT EVENTS */}

                <div
                    style={{
                        background:
                            "#ffffff",
                        border:
                            "1px solid #e2e8f0",
                        borderRadius:
                            "16px",
                        padding:
                            "25px",
                    }}
                >

                    <h2
                        style={{
                            margin:
                                "0 0 5px",
                            fontSize:
                                "22px",
                            color:
                                "#0f172a",
                        }}
                    >
                        Recent Events
                    </h2>


                    <p
                        style={{
                            margin:
                                "0 0 18px",
                            color:
                                "#64748b",
                            fontSize:
                                "14px",
                        }}
                    >
                        Latest machine activity
                    </p>


                    {events.length === 0 ? (

                        <div
                            style={{
                                padding:
                                    "30px 0",
                                textAlign:
                                    "center",
                                color:
                                    "#94a3b8",
                            }}
                        >
                            No events available
                        </div>

                    ) : (

                        events
                            .slice(0, 6)
                            .map(
                                (
                                    event,
                                    index
                                ) => (

                                    <div
                                        key={
                                            event.id ||
                                            index
                                        }
                                        style={{
                                            display:
                                                "flex",
                                            alignItems:
                                                "center",
                                            justifyContent:
                                                "space-between",
                                            padding:
                                                "13px 0",
                                            borderBottom:
                                                index <
                                                Math.min(
                                                    events.length,
                                                    6
                                                ) -
                                                    1
                                                    ? "1px solid #eef2f7"
                                                    : "none",
                                        }}
                                    >

                                        <div
                                            style={{
                                                display:
                                                    "flex",
                                                alignItems:
                                                    "center",
                                                gap:
                                                    "12px",
                                            }}
                                        >

                                            <span
                                                style={{
                                                    width:
                                                        "9px",
                                                    height:
                                                        "9px",
                                                    borderRadius:
                                                        "50%",
                                                    background:
                                                        event.event_type ===
                                                        "Downtime Started"
                                                            ? "#dc2626"
                                                            : event.event_type ===
                                                              "Downtime Ended"
                                                            ? "#f59e0b"
                                                            : "#16a34a",
                                                }}
                                            />


                                            <div>

                                                <div
                                                    style={{
                                                        fontWeight:
                                                            700,
                                                        color:
                                                            "#1e293b",
                                                        fontSize:
                                                            "14px",
                                                    }}
                                                >
                                                    {
                                                        event.event_type
                                                    }
                                                </div>


                                                <div
                                                    style={{
                                                        color:
                                                            "#94a3b8",
                                                        fontSize:
                                                            "12px",
                                                        marginTop:
                                                            "3px",
                                                    }}
                                                >
                                                    {
                                                        event.description
                                                    }
                                                </div>

                                            </div>

                                        </div>


                                        <div
                                            style={{
                                                color:
                                                    "#94a3b8",
                                                fontSize:
                                                    "12px",
                                                whiteSpace:
                                                    "nowrap",
                                            }}
                                        >
                                            {formatTime(
                                                event.event_time
                                            )}
                                        </div>

                                    </div>

                                )
                            )

                    )}

                </div>

            </div>


            {/* =========================================
                MONITORING LOGIC
            ========================================= */}

            <div
                style={{
                    marginTop:
                        "25px",
                    background:
                        "#fffbeb",
                    border:
                        "1px solid #fde68a",
                    borderRadius:
                        "14px",
                    padding:
                        "17px 20px",
                    display:
                        "flex",
                    alignItems:
                        "center",
                    gap:
                        "14px",
                }}
            >

                <div
                    style={{
                        fontSize:
                            "24px",
                    }}
                >
                    ⚠
                </div>


                <div>

                    <div
                        style={{
                            fontWeight:
                                700,
                            color:
                                "#92400e",
                            marginBottom:
                                "3px",
                        }}
                    >
                        Machine Monitoring Logic
                    </div>


                    <div
                        style={{
                            color:
                                "#a16207",
                            fontSize:
                                "13px",
                        }}
                    >
                        Production pulse starts
                        or maintains the RUNNING
                        state. If no production pulse
                        is detected for more than
                        10 seconds, the machine enters
                        DOWNTIME. A new production
                        pulse returns the machine to
                        RUNNING.
                    </div>

                </div>

            </div>


            {/* =========================================
                REFRESH WARNING
            ========================================= */}

            {error && (

                <div
                    style={{
                        marginTop:
                            "15px",
                        padding:
                            "12px 15px",
                        background:
                            "#fef2f2",
                        border:
                            "1px solid #fecaca",
                        color:
                            "#b91c1c",
                        borderRadius:
                            "10px",
                        fontSize:
                            "13px",
                    }}
                >

                    Live data refresh warning:
                    {" "}
                    {error}

                </div>

            )}

        </div>

    );

}


// =====================================================
// SUMMARY CARD
// =====================================================

function SummaryCard({
    title,
    value,
    subtitle,
    valueColor,
}) {

    return (

        <div
            style={{
                background:
                    "#ffffff",
                border:
                    "1px solid #e2e8f0",
                borderRadius:
                    "15px",
                padding:
                    "22px",
            }}
        >

            <div
                style={{
                    color:
                        "#64748b",
                    fontWeight:
                        600,
                    fontSize:
                        "14px",
                }}
            >
                {title}
            </div>


            <div
                style={{
                    fontSize:
                        "34px",
                    fontWeight:
                        800,
                    marginTop:
                        "8px",
                    color:
                        valueColor ||
                        "#0f172a",
                }}
            >
                {value}
            </div>


            <div
                style={{
                    marginTop:
                        "4px",
                    color:
                        "#94a3b8",
                    fontSize:
                        "13px",
                }}
            >
                {subtitle}
            </div>

        </div>

    );

}


// =====================================================
// INFORMATION BOX
// =====================================================

function InfoBox({
    label,
    value,
}) {

    return (

        <div
            style={{
                background:
                    "#f8fafc",
                borderRadius:
                    "10px",
                padding:
                    "15px",
            }}
        >

            <div
                style={{
                    color:
                        "#94a3b8",
                    fontSize:
                        "11px",
                    fontWeight:
                        600,
                    marginBottom:
                        "5px",
                }}
            >
                {label}
            </div>


            <div
                style={{
                    color:
                        "#334155",
                    fontSize:
                        "16px",
                    fontWeight:
                        700,
                }}
            >
                {value}
            </div>

        </div>

    );

}