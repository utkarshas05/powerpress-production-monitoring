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

const PORT = process.env.PORT || 5000;


// =====================================================
// BASIC SERVER TEST
// =====================================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "PowerPress Monitoring Backend is running"
    });

});


// =====================================================
// DATABASE CONNECTION TEST
// =====================================================

app.get("/api/test/database", async (req, res) => {

    try {

        const result = await pool.query(
            "SELECT NOW() AS current_time"
        );

        res.json({
            success: true,
            message: "Database connected successfully",
            time: result.rows[0].current_time
        });

    } catch (error) {

        console.error(
            "Database connection error:",
            error
        );

        res.status(500).json({
            success: false,
            error: "Database connection failed",
            details: error.message
        });

    }

});


// =====================================================
// GET ALL MACHINES
// =====================================================

app.get("/api/machines", async (req, res) => {

    try {

        const result = await pool.query(`
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
            machines: result.rows
        });

    } catch (error) {

        console.error(
            "Get machines error:",
            error
        );

        res.status(500).json({
            success: false,
            error: "Unable to fetch machines",
            details: error.message
        });

    }

});


// =====================================================
// GET SINGLE MACHINE
// =====================================================
//
// IMPORTANT:
//
// The frontend can send either:
//
// /api/machines/1
//
// OR
//
// /api/machines/PRESS_01
//
// We support both.
// =====================================================

app.get("/api/machines/:machineId", async (req, res) => {

    try {

        const { machineId } = req.params;

        let result;


        // -------------------------------------------------
        // IF NUMERIC → SEARCH BY DATABASE ID
        // -------------------------------------------------

        if (/^\d+$/.test(machineId)) {

            result = await pool.query(
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
                WHERE id = $1
                `,
                [Number(machineId)]
            );

        }

        // -------------------------------------------------
        // OTHERWISE → SEARCH BY MACHINE CODE
        // -------------------------------------------------

        else {

            result = await pool.query(
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
                [machineId]
            );

        }


        // -------------------------------------------------
        // MACHINE NOT FOUND
        // -------------------------------------------------

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                error: "Machine not found"
            });

        }


        res.json({
            success: true,
            machine: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Machine fetch error:",
            error
        );

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// =====================================================
// ADD NEW MACHINE
// =====================================================

app.post("/api/machines", async (req, res) => {

    try {

        const {
            machineCode,
            machineName,
            machineType,
            inputType,
            deviceId,
            hardwareId
        } = req.body;


        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!machineCode) {

            return res.status(400).json({
                success: false,
                error: "Machine code is required"
            });

        }


        if (!machineName) {

            return res.status(400).json({
                success: false,
                error: "Machine name is required"
            });

        }


        // -------------------------------------------------
        // INSERT MACHINE
        // -------------------------------------------------

        const result = await pool.query(
            `
            INSERT INTO public.machines (
                machine_code,
                machine_name,
                machine_type,
                input_type,
                device_id,
                hardware_id,
                is_active
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                true
            )
            RETURNING *
            `,
            [
                machineCode,
                machineName,
                machineType || "Power Press",
                inputType || "Pulse",
                deviceId || null,
                hardwareId || null
            ]
        );


        res.status(201).json({

            success: true,

            message:
                "Machine added successfully",

            machine:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "Add machine error:",
            error
        );


        // PostgreSQL duplicate error

        if (error.code === "23505") {

            return res.status(409).json({

                success: false,

                error:
                    "Machine code or device ID already exists"

            });

        }


        res.status(500).json({

            success: false,

            error:
                "Unable to add machine",

            details:
                error.message

        });

    }

});


// =====================================================
// UPDATE MACHINE
// =====================================================

app.put("/api/machines/:machineId", async (req, res) => {

    try {

        const { machineId } = req.params;

        const {
            machineCode,
            machineName,
            machineType,
            inputType,
            deviceId,
            hardwareId
        } = req.body;


        const result = await pool.query(
            `
            UPDATE public.machines

            SET
                machine_code = COALESCE($1, machine_code),
                machine_name = COALESCE($2, machine_name),
                machine_type = COALESCE($3, machine_type),
                input_type = COALESCE($4, input_type),
                device_id = COALESCE($5, device_id),
                hardware_id = COALESCE($6, hardware_id)

            WHERE id = $7

            RETURNING *
            `,
            [
                machineCode || null,
                machineName || null,
                machineType || null,
                inputType || null,
                deviceId || null,
                hardwareId || null,
                Number(machineId)
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                error:
                    "Machine not found"

            });

        }


        res.json({

            success: true,

            message:
                "Machine updated successfully",

            machine:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "Update machine error:",
            error
        );


        if (error.code === "23505") {

            return res.status(409).json({

                success: false,

                error:
                    "Machine code or device ID already exists"

            });

        }


        res.status(500).json({

            success: false,

            error:
                "Unable to update machine",

            details:
                error.message

        });

    }

});


// =====================================================
// ACTIVATE / DEACTIVATE MACHINE
// =====================================================

app.patch(
    "/api/machines/:machineId/status",
    async (req, res) => {

        try {

            const { machineId } = req.params;

            const { isActive } = req.body;


            if (
                typeof isActive !==
                "boolean"
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "isActive must be true or false"

                });

            }


            const result =
                await pool.query(
                    `
                    UPDATE public.machines

                    SET
                        is_active = $1

                    WHERE id = $2

                    RETURNING *
                    `,
                    [
                        isActive,
                        Number(machineId)
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Machine not found"

                });

            }


            res.json({

                success: true,

                message:
                    isActive
                        ? "Machine activated"
                        : "Machine deactivated",

                machine:
                    result.rows[0]

            });

        } catch (error) {

            console.error(
                "Machine status error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Unable to update machine status",

                details:
                    error.message

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
//     "status": "RUNNING",
//     "cycleCount": 25,
//     "jobsPerMinute": 5,
//     "pulse": true
// }
//
// The backend identifies the machine ONLY using
// device_id.
//
// ESP001 → PRESS_01
//
// =====================================================

app.post(
    "/api/machine/data",
    async (req, res) => {

        try {

            const {
                deviceId,
                status,
                cycleCount,
                jobsPerMinute,
                pulse
            } = req.body;


            // -------------------------------------------------
            // VALIDATE DEVICE
            // -------------------------------------------------

            if (!deviceId) {

                return res.status(400).json({

                    success: false,

                    error:
                        "deviceId is required"

                });

            }


            // -------------------------------------------------
            // FIND MACHINE USING ESP DEVICE ID
            // -------------------------------------------------

            const machineResult =
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
                        is_active

                    FROM public.machines

                    WHERE device_id = $1
                    `,
                    [deviceId]
                );


            // -------------------------------------------------
            // UNKNOWN DEVICE
            // -------------------------------------------------

            if (
                machineResult.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Device is not registered",

                    deviceId:
                        deviceId

                });

            }


            const machine =
                machineResult.rows[0];


            // -------------------------------------------------
            // CHECK MACHINE ACTIVE
            // -------------------------------------------------

            if (!machine.is_active) {

                return res.status(403).json({

                    success: false,

                    error:
                        "Machine is inactive",

                    machineCode:
                        machine.machine_code

                });

            }


            // -------------------------------------------------
            // NORMALIZE VALUES
            // -------------------------------------------------

            const safeStatus =
                status || "RUNNING";


            const safeCycleCount =
                Number.isFinite(
                    Number(cycleCount)
                )
                    ? Number(cycleCount)
                    : 0;


            const safeJobsPerMinute =
                Number.isFinite(
                    Number(jobsPerMinute)
                )
                    ? Number(jobsPerMinute)
                    : 0;


            const safePulse =
                pulse === true;


            // -------------------------------------------------
            // LOG
            // -------------------------------------------------

            console.log(
                "-----------------------------------------"
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
                "Machine Name:",
                machine.machine_name
            );

            console.log(
                "Status:",
                safeStatus
            );

            console.log(
                "Cycle Count:",
                safeCycleCount
            );

            console.log(
                "Jobs/Minute:",
                safeJobsPerMinute
            );

            console.log(
                "Pulse:",
                safePulse
            );

            console.log(
                "-----------------------------------------"
            );


            // -------------------------------------------------
            // SAVE PRODUCTION RECORD
            // -------------------------------------------------

            const productionResult =
                await pool.query(
                    `
                    INSERT INTO
                    public.production_records (

                        machine_id,
                        machine_code,
                        device_id,
                        cycle_count,
                        jobs_per_minute,
                        status,
                        pulse_received

                    )

                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7
                    )

                    RETURNING *
                    `,
                    [
                        machine.id,
                        machine.machine_code,
                        machine.device_id,
                        safeCycleCount,
                        safeJobsPerMinute,
                        safeStatus,
                        safePulse
                    ]
                );


            // -------------------------------------------------
            // SAVE MACHINE EVENT
            // -------------------------------------------------

            await pool.query(
                `
                INSERT INTO
                public.machine_events (

                    machine_id,
                    machine_code,
                    device_id,
                    event_type,
                    description

                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5
                )
                `,
                [
                    machine.id,
                    machine.machine_code,
                    machine.device_id,

                    safePulse
                        ? "Production Pulse"
                        : "Machine Status",

                    safePulse
                        ? "Machine cycle signal received"
                        : `Machine status reported as ${safeStatus}`
                ]
            );


            // -------------------------------------------------
            // RESPONSE
            // -------------------------------------------------

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
                        machine.device_id

                },

                data:
                    productionResult.rows[0]

            });

        } catch (error) {

            console.error(
                "Machine data error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    "Unable to store machine data",

                details:
                    error.message

            });

        }

    }
);


// =====================================================
// GET MACHINE PRODUCTION
// =====================================================

app.get(
    "/api/machines/:machineId/production",
    async (req, res) => {

        try {

            const machineId =
                Number(req.params.machineId);


            if (
                !Number.isInteger(machineId)
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Invalid machine ID"

                });

            }


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

                    FROM
                        public.production_records

                    WHERE
                        machine_id = $1

                    ORDER BY
                        timestamp DESC

                    LIMIT 100
                    `,
                    [machineId]
                );


            res.json({

                success: true,

                machineId:
                    machineId,

                records:
                    result.rows

            });

        } catch (error) {

            console.error(
                "Production fetch error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    "Unable to fetch production data",

                details:
                    error.message

            });

        }

    }
);


// =====================================================
// GET MACHINE EVENTS
// =====================================================

app.get(
    "/api/machines/:machineId/events",
    async (req, res) => {

        try {

            const machineId =
                Number(req.params.machineId);


            if (
                !Number.isInteger(machineId)
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Invalid machine ID"

                });

            }


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

                    FROM
                        public.machine_events

                    WHERE
                        machine_id = $1

                    ORDER BY
                        event_time DESC

                    LIMIT 50
                    `,
                    [machineId]
                );


            res.json({

                success: true,

                machineId:
                    machineId,

                events:
                    result.rows

            });

        } catch (error) {

            console.error(
                "Events fetch error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    "Unable to fetch machine events",

                details:
                    error.message

            });

        }

    }
);


// =====================================================
// GET MACHINE DOWNTIME
// =====================================================

app.get(
    "/api/machines/:machineId/downtime",
    async (req, res) => {

        try {

            const machineId =
                Number(req.params.machineId);


            if (
                !Number.isInteger(machineId)
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Invalid machine ID"

                });

            }


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
                        reason,
                        created_at

                    FROM
                        public.downtime_records

                    WHERE
                        machine_id = $1

                    ORDER BY
                        start_time DESC

                    LIMIT 100
                    `,
                    [machineId]
                );


            res.json({

                success: true,

                machineId:
                    machineId,

                downtime:
                    result.rows

            });

        } catch (error) {

            console.error(
                "Downtime fetch error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    "Unable to fetch downtime data",

                details:
                    error.message

            });

        }

    }
);


// =====================================================
// SERVER START
// =====================================================

app.listen(PORT, () => {

    console.log(
        `PowerPress Backend running on http://localhost:${PORT}`
    );

});