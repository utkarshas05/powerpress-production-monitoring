const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();


// =====================================================
// DATABASE CONNECTION
// =====================================================

const pool = new Pool({

    host: process.env.DB_HOST,

    port: process.env.DB_PORT,

    database: process.env.DB_NAME,

    user: process.env.DB_USER,

    password: process.env.DB_PASSWORD,

});


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(express.json());


// =====================================================
// PORT
// =====================================================

const PORT =
    process.env.PORT || 5000;


// =====================================================
// MONITORING SETTINGS
// =====================================================
//
// Pulse received:
//      MACHINE = RUNNING
//
// No pulse for > 10 seconds:
//      MACHINE = DOWNTIME
//
// =====================================================

const DOWNTIME_THRESHOLD_SECONDS = 10;


// =====================================================
// DATABASE CONNECTION TEST
// =====================================================

pool.query("SELECT NOW()")
    .then(() => {

        console.log(
            "PostgreSQL database connected successfully"
        );

    })
    .catch((error) => {

        console.error(
            "PostgreSQL connection error:",
            error.message
        );

    });


// =====================================================
// BASIC SERVER TEST
// =====================================================

app.get("/", (req, res) => {

    res.json({

        success: true,

        message:
            "PowerPress Monitoring Backend is running",

    });

});


// =====================================================
// DATABASE TEST
// =====================================================

app.get("/api/test/database", async (req, res) => {

    try {

        const result =
            await pool.query(
                "SELECT NOW() AS current_time"
            );


        res.json({

            success: true,

            message:
                "Database connection successful",

            currentTime:
                result.rows[0].current_time,

        });

    } catch (error) {

        console.error(
            "Database test error:",
            error
        );


        res.status(500).json({

            success: false,

            error:
                error.message,

        });

    }

});


// =====================================================
// GET ALL MACHINES
// =====================================================

app.get("/api/machines", async (req, res) => {

    try {

        const result =
            await pool.query(`
                SELECT
                    id,
                    machine_code,
                    machine_name,
                    machine_type,
                    input_type,
                    device_id,
                    hardware_id,
                    is_active,
                    created_at
                FROM public.machines
                ORDER BY id
            `);


        res.json({

            success: true,

            machines:
                result.rows,

        });

    } catch (error) {

        console.error(
            "Get machines error:",
            error
        );


        res.status(500).json({

            success: false,

            error:
                "Unable to fetch machines",

        });

    }

});


// =====================================================
// GET SINGLE MACHINE
// =====================================================

app.get(
    "/api/machines/:machineId",
    async (req, res) => {

        try {

            const {
                machineId
            } = req.params;


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        machine_code,
                        machine_name,
                        machine_type,
                        input_type,
                        device_id,
                        hardware_id,
                        is_active,
                        created_at
                    FROM public.machines
                    WHERE machine_code = $1
                    `,
                    [
                        machineId
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Machine not found",

                });

            }


            res.json({

                success: true,

                machine:
                    result.rows[0],

            });

        } catch (error) {

            console.error(
                "Get machine error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    error.message,

            });

        }

    }
);


// =====================================================
// GET MACHINE RUNTIME STATE
// =====================================================

app.get(
    "/api/machines/:machineCode/runtime",
    async (req, res) => {

        try {

            const {
                machineCode
            } = req.params;


            const result =
                await pool.query(
                    `
                    SELECT
                        machine_id,
                        machine_code,
                        device_id,
                        last_pulse_time,
                        current_status,
                        downtime_start,
                        updated_at
                    FROM public.machine_runtime_state
                    WHERE machine_code = $1
                    `,
                    [
                        machineCode
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.json({

                    success: true,

                    runtime: null,

                });

            }


            res.json({

                success: true,

                runtime:
                    result.rows[0],

            });

        } catch (error) {

            console.error(
                "Runtime API error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    error.message,

            });

        }

    }
);


// =====================================================
// GET MACHINE PRODUCTION
// =====================================================

app.get(
    "/api/machines/:machineCode/production",
    async (req, res) => {

        try {

            const {
                machineCode
            } = req.params;


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        machine_id,
                        machine_code,
                        device_id,
                        timestamp,
                        cycle_count,
                        jobs_per_minute,
                        status,
                        pulse_received
                    FROM public.production_records
                    WHERE machine_code = $1
                    ORDER BY timestamp DESC
                    LIMIT 1000
                    `,
                    [
                        machineCode
                    ]
                );


            res.json({

                success: true,

                production:
                    result.rows,

            });

        } catch (error) {

            console.error(
                "Production API error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    error.message,

            });

        }

    }
);


// =====================================================
// GET MACHINE EVENTS
// =====================================================

app.get(
    "/api/machines/:machineCode/events",
    async (req, res) => {

        try {

            const {
                machineCode
            } = req.params;


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        machine_id,
                        machine_code,
                        device_id,
                        event_type,
                        description,
                        event_time
                    FROM public.machine_events
                    WHERE machine_code = $1
                    ORDER BY event_time DESC
                    LIMIT 100
                    `,
                    [
                        machineCode
                    ]
                );


            res.json({

                success: true,

                events:
                    result.rows,

            });

        } catch (error) {

            console.error(
                "Events API error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    error.message,

            });

        }

    }
);


// =====================================================
// GET MACHINE DOWNTIME
// =====================================================

app.get(
    "/api/machines/:machineCode/downtime",
    async (req, res) => {

        try {

            const {
                machineCode
            } = req.params;


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        machine_id,
                        machine_code,
                        device_id,
                        start_time,
                        end_time,
                        duration_seconds,
                        reason
                    FROM public.downtime_records
                    WHERE machine_code = $1
                    ORDER BY start_time DESC
                    LIMIT 500
                    `,
                    [
                        machineCode
                    ]
                );


            res.json({

                success: true,

                downtime:
                    result.rows,

            });

        } catch (error) {

            console.error(
                "Downtime API error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    error.message,

            });

        }

    }
);


// =====================================================
// RECEIVE DATA FROM ESP8266
// =====================================================
//
// Expected:
//
// {
//     "deviceId": "ESP001",
//     "pulse": true,
//     "cycleCount": 1,
//     "jobsPerMinute": 1,
//     "status": "RUNNING"
// }
//
// IMPORTANT:
// The backend does NOT trust the incoming status.
//
// If a valid pulse is received:
//      RUNNING
//
// The background monitor handles:
//      DOWNTIME
//
// =====================================================

app.post(
    "/api/machine/data",
    async (req, res) => {

        const client =
            await pool.connect();


        try {

            // =============================================
            // READ REQUEST
            // =============================================

            const {
                deviceId,
                machineId,
                pulse,
                cycleCount,
                jobsPerMinute,
            } = req.body;


            // =============================================
            // VALIDATION
            // =============================================

            if (!deviceId) {

                return res.status(400).json({

                    success: false,

                    error:
                        "deviceId is required",

                });

            }


            // =============================================
            // DETERMINE MACHINE
            // =============================================

            let machineResult;


            if (machineId) {

                machineResult =
                    await client.query(
                        `
                        SELECT
                            id,
                            machine_code,
                            machine_name,
                            machine_type,
                            input_type,
                            device_id,
                            hardware_id,
                            is_active
                        FROM public.machines
                        WHERE machine_code = $1
                        `,
                        [
                            machineId
                        ]
                    );

            } else {

                machineResult =
                    await client.query(
                        `
                        SELECT
                            id,
                            machine_code,
                            machine_name,
                            machine_type,
                            input_type,
                            device_id,
                            hardware_id,
                            is_active
                        FROM public.machines
                        WHERE device_id = $1
                        `,
                        [
                            deviceId
                        ]
                    );

            }


            // =============================================
            // MACHINE NOT FOUND
            // =============================================

            if (
                machineResult.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Machine not found",

                    deviceId,

                    machineId:
                        machineId || null,

                });

            }


            const machine =
                machineResult.rows[0];


            // =============================================
            // MACHINE ACTIVE CHECK
            // =============================================

            if (
                !machine.is_active
            ) {

                return res.status(403).json({

                    success: false,

                    error:
                        "Machine is inactive",

                    machineId:
                        machine.machine_code,

                });

            }


            // =============================================
            // CURRENT TIME
            // =============================================

            const now =
                new Date();


            // =============================================
            // VALID PULSE
            // =============================================

            const pulseReceived =
                pulse !== false;


            // =============================================
            // NEW STATUS
            // =============================================
            //
            // Every valid pulse means the machine
            // is currently running.
            //
            // =============================================

            const newStatus =
                pulseReceived
                    ? "RUNNING"
                    : "OFFLINE";


            // =============================================
            // GET PREVIOUS RUNTIME STATE
            // =============================================

            const stateResult =
                await client.query(
                    `
                    SELECT
                        machine_id,
                        machine_code,
                        device_id,
                        last_pulse_time,
                        current_status,
                        downtime_start
                    FROM public.machine_runtime_state
                    WHERE machine_id = $1
                    FOR UPDATE
                    `,
                    [
                        machine.id
                    ]
                );


            const previousState =
                stateResult.rows.length > 0
                    ? stateResult.rows[0]
                    : null;


            const previousStatus =
                previousState?.current_status ||
                "OFFLINE";


            let downtimeStart =
                previousState?.downtime_start ||
                null;


            // =============================================
            // BEGIN TRANSACTION
            // =============================================

            await client.query(
                "BEGIN"
            );


            // =============================================
            // MACHINE RESUMED FROM DOWNTIME
            // =============================================

            let downtimeEnded =
                false;

            let downtimeDuration =
                0;


            if (
                pulseReceived &&
                previousStatus ===
                    "DOWNTIME" &&
                downtimeStart
            ) {

                const downtimeEnd =
                    now;


                downtimeDuration =
                    Math.max(
                        0,
                        Math.floor(
                            (
                                downtimeEnd.getTime() -
                                new Date(
                                    downtimeStart
                                ).getTime()
                            ) / 1000
                        )
                    );


                // -----------------------------------------
                // STORE DOWNTIME RECORD
                // -----------------------------------------

                await client.query(
                    `
                    INSERT INTO public.downtime_records
                    (
                        machine_id,
                        machine_code,
                        device_id,
                        start_time,
                        end_time,
                        duration_seconds,
                        reason
                    )
                    VALUES
                    ($1,$2,$3,$4,$5,$6,$7)
                    `,
                    [
                        machine.id,
                        machine.machine_code,
                        deviceId,
                        downtimeStart,
                        downtimeEnd,
                        downtimeDuration,
                        "No production pulse",
                    ]
                );


                // -----------------------------------------
                // DOWNTIME END EVENT
                // -----------------------------------------

                await client.query(
                    `
                    INSERT INTO public.machine_events
                    (
                        machine_id,
                        machine_code,
                        device_id,
                        event_type,
                        description,
                        event_time
                    )
                    VALUES
                    ($1,$2,$3,$4,$5,$6)
                    `,
                    [
                        machine.id,
                        machine.machine_code,
                        deviceId,
                        "Downtime Ended",
                        `Machine resumed after ${downtimeDuration} seconds`,
                        now,
                    ]
                );


                downtimeStart =
                    null;


                downtimeEnded =
                    true;


                console.log(
                    `DOWNTIME ENDED: ${machine.machine_code} - ${downtimeDuration}s`
                );

            }


            // =============================================
            // STORE PRODUCTION RECORD
            // =============================================

            await client.query(
                `
                INSERT INTO public.production_records
                (
                    machine_id,
                    machine_code,
                    device_id,
                    timestamp,
                    cycle_count,
                    jobs_per_minute,
                    status,
                    pulse_received
                )
                VALUES
                ($1,$2,$3,$4,$5,$6,$7,$8)
                `,
                [
                    machine.id,
                    machine.machine_code,
                    deviceId,
                    now,
                    Number(
                        cycleCount
                    ) || 0,
                    Number(
                        jobsPerMinute
                    ) || 0,
                    newStatus,
                    pulseReceived,
                ]
            );


            // =============================================
            // STORE PRODUCTION EVENT
            // =============================================

            if (pulseReceived) {

                await client.query(
                    `
                    INSERT INTO public.machine_events
                    (
                        machine_id,
                        machine_code,
                        device_id,
                        event_type,
                        description,
                        event_time
                    )
                    VALUES
                    ($1,$2,$3,$4,$5,$6)
                    `,
                    [
                        machine.id,
                        machine.machine_code,
                        deviceId,
                        "Production Pulse",
                        "Machine cycle signal received",
                        now,
                    ]
                );

            }


            // =============================================
            // CREATE / UPDATE RUNTIME STATE
            // =============================================

            await client.query(
                `
                INSERT INTO public.machine_runtime_state
                (
                    machine_id,
                    machine_code,
                    device_id,
                    last_pulse_time,
                    current_status,
                    downtime_start,
                    updated_at
                )
                VALUES
                ($1,$2,$3,$4,$5,$6,$7)

                ON CONFLICT (machine_id)

                DO UPDATE SET

                    machine_code =
                        EXCLUDED.machine_code,

                    device_id =
                        EXCLUDED.device_id,

                    last_pulse_time =
                        EXCLUDED.last_pulse_time,

                    current_status =
                        EXCLUDED.current_status,

                    downtime_start =
                        EXCLUDED.downtime_start,

                    updated_at =
                        EXCLUDED.updated_at
                `,
                [
                    machine.id,
                    machine.machine_code,
                    deviceId,
                    now,
                    newStatus,
                    downtimeStart,
                    now,
                ]
            );


            // =============================================
            // COMMIT
            // =============================================

            await client.query(
                "COMMIT"
            );


            // =============================================
            // LOG
            // =============================================

            console.log(
                "----------------------------------------"
            );

            console.log(
                "ESP8266 DATA RECEIVED"
            );

            console.log(
                "Device ID:",
                deviceId
            );

            console.log(
                "Machine:",
                machine.machine_code
            );

            console.log(
                "Previous Status:",
                previousStatus
            );

            console.log(
                "New Status:",
                newStatus
            );

            console.log(
                "Pulse Received:",
                pulseReceived
            );

            console.log(
                "Cycle Count:",
                cycleCount
            );

            console.log(
                "Jobs / Minute:",
                jobsPerMinute
            );

            if (downtimeEnded) {

                console.log(
                    "Downtime Duration:",
                    downtimeDuration,
                    "seconds"
                );

            }

            console.log(
                "----------------------------------------"
            );


            // =============================================
            // RESPONSE
            // =============================================

            res.json({

                success: true,

                message:
                    "Machine data stored successfully",

                machine: {

                    id:
                        machine.id,

                    machineCode:
                        machine.machine_code,

                    machineName:
                        machine.machine_name,

                    deviceId:
                        deviceId,

                },

                data: {

                    status:
                        newStatus,

                    cycleCount:
                        Number(
                            cycleCount
                        ) || 0,

                    jobsPerMinute:
                        Number(
                            jobsPerMinute
                        ) || 0,

                    pulseReceived,

                    downtimeEnded,

                    downtimeDuration,

                },

            });

        } catch (error) {

            // =============================================
            // ROLLBACK
            // =============================================

            try {

                await client.query(
                    "ROLLBACK"
                );

            } catch (
                rollbackError
            ) {

                console.error(
                    "Rollback error:",
                    rollbackError
                );

            }


            console.error(
                "Machine data error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    error.message,

            });

        } finally {

            client.release();

        }

    }
);


// =====================================================
// MANUAL MACHINE STATUS ENDPOINT
// =====================================================
//
// This endpoint is mainly useful for testing.
// ESP pulse data should normally use /machine/data.
//
// =====================================================

app.post(
    "/api/machine/status",
    async (req, res) => {

        try {

            const {
                machineId,
                status,
            } = req.body;


            if (!machineId) {

                return res.status(400).json({

                    success: false,

                    error:
                        "machineId is required",

                });

            }


            if (!status) {

                return res.status(400).json({

                    success: false,

                    error:
                        "status is required",

                });

            }


            const machineResult =
                await pool.query(
                    `
                    SELECT
                        id,
                        machine_code,
                        machine_name,
                        is_active
                    FROM public.machines
                    WHERE machine_code = $1
                    `,
                    [
                        machineId
                    ]
                );


            if (
                machineResult.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Machine not found",

                });

            }


            const machine =
                machineResult.rows[0];


            if (
                !machine.is_active
            ) {

                return res.status(403).json({

                    success: false,

                    error:
                        "Machine is inactive",

                });

            }


            const allowedStatuses = [
                "RUNNING",
                "IDLE",
                "DOWNTIME",
                "OFFLINE",
            ];


            const normalizedStatus =
                String(
                    status
                ).toUpperCase();


            if (
                !allowedStatuses.includes(
                    normalizedStatus
                )
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Invalid status",

                });

            }


            await pool.query(
                `
                UPDATE public.machine_runtime_state

                SET
                    current_status = $1,
                    updated_at = NOW()

                WHERE machine_id = $2
                `,
                [
                    normalizedStatus,
                    machine.id,
                ]
            );


            res.json({

                success: true,

                machine: {

                    machineId:
                        machine.machine_code,

                    machineName:
                        machine.machine_name,

                    status:
                        normalizedStatus,

                },

            });

        } catch (error) {

            console.error(
                "Status update error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    error.message,

            });

        }

    }
);


// =====================================================
// AUTOMATIC MACHINE MONITOR
// =====================================================
//
// Runs every 1 second.
//
// If:
//
//     current_status = RUNNING
//     AND
//     last_pulse_time > 10 seconds ago
//
// Then:
//
//     current_status = DOWNTIME
//
// =====================================================

async function monitorMachines() {

    try {

        const result =
            await pool.query(
                `
                SELECT
                    machine_id,
                    machine_code,
                    device_id,
                    last_pulse_time,
                    current_status,
                    downtime_start
                FROM public.machine_runtime_state
                WHERE last_pulse_time IS NOT NULL
                `
            );


        const now =
            new Date();


        for (
            const machine
            of result.rows
        ) {

            const elapsedSeconds =
                (
                    now.getTime() -
                    new Date(
                        machine.last_pulse_time
                    ).getTime()
                ) / 1000;


            // =============================================
            // MACHINE SHOULD ENTER DOWNTIME
            // =============================================

            if (
                elapsedSeconds >
                    DOWNTIME_THRESHOLD_SECONDS &&
                machine.current_status !==
                    "DOWNTIME"
            ) {

                // -----------------------------------------
                // UPDATE RUNTIME STATE
                // -----------------------------------------

                await pool.query(
                    `
                    UPDATE public.machine_runtime_state

                    SET
                        current_status = 'DOWNTIME',
                        downtime_start = $1,
                        updated_at = $1

                    WHERE machine_id = $2
                    `,
                    [
                        now,
                        machine.machine_id,
                    ]
                );


                // -----------------------------------------
                // STORE EVENT
                // -----------------------------------------

                await pool.query(
                    `
                    INSERT INTO public.machine_events
                    (
                        machine_id,
                        machine_code,
                        device_id,
                        event_type,
                        description,
                        event_time
                    )
                    VALUES
                    ($1,$2,$3,$4,$5,$6)
                    `,
                    [
                        machine.machine_id,
                        machine.machine_code,
                        machine.device_id,
                        "Downtime Started",
                        "No production pulse detected for more than 10 seconds",
                        now,
                    ]
                );


                console.log(
                    `DOWNTIME STARTED: ${machine.machine_code}`
                );

            }

        }

    } catch (error) {

        console.error(
            "Runtime monitor error:",
            error
        );

    }

}


// =====================================================
// RUN MACHINE MONITOR
// =====================================================

setInterval(
    monitorMachines,
    1000
);


// =====================================================
// SERVER START
// =====================================================

app.listen(
    PORT,
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "PowerPress Backend"
        );

        console.log(
            "========================================"
        );

        console.log(
            `Server: http://localhost:${PORT}`
        );

        console.log(
            `Running threshold: 5s`
        );

        console.log(
            `Downtime threshold: ${DOWNTIME_THRESHOLD_SECONDS}s`
        );

        console.log(
            "Machine monitoring: ACTIVE"
        );

        console.log(
            "========================================"
        );

    }
);