import { useEffect, useState } from "react";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Factory,
  Gauge,
  LogOut,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  getMachines,
  getMachineRuntime,
} from "./api/api";


// =====================================================
// API BASE URL
// =====================================================
const API_BASE_URL = "";



// =====================================================
// GET MACHINE PRODUCTION
// =====================================================
//
// Uses the production endpoint already available
// in the backend.
//
// =====================================================

async function getMachineProduction(machineCode) {

  try {

    const response = await fetch(
      `${API_BASE_URL}/api/machines/${encodeURIComponent(
        machineCode
      )}/production`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    return data.production || [];

  } catch (error) {

    console.error(
      "Production API error:",
      error
    );

    return [];
  }
}


// =====================================================
// STATUS CONFIGURATION
// =====================================================

function getStatusConfig(status) {

  switch (status) {

    case "RUNNING":

      return {
        label: "RUNNING",
        color: "#16a34a",
        background: "#dcfce7",
        icon: CheckCircle2,
      };


    case "IDLE":

      return {
        label: "IDLE",
        color: "#d97706",
        background: "#fef3c7",
        icon: Clock3,
      };


    case "DOWNTIME":

      return {
        label: "DOWNTIME",
        color: "#dc2626",
        background: "#fee2e2",
        icon: AlertTriangle,
      };


    default:

      return {
        label: "OFFLINE",
        color: "#64748b",
        background: "#f1f5f9",
        icon: WifiOff,
      };
  }
}


// =====================================================
// FORMAT TIME
// =====================================================

function formatDuration(seconds) {

  if (
    seconds === null ||
    seconds === undefined ||
    Number.isNaN(Number(seconds))
  ) {
    return "--:--";
  }

  const totalSeconds =
    Math.max(
      0,
      Math.floor(Number(seconds))
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
// CHECK WHETHER PULSE IS RECENT
// =====================================================

function isRecentlyConnected(lastPulseTime) {

  if (!lastPulseTime) {
    return false;
  }

  const lastPulse =
    new Date(lastPulseTime).getTime();

  if (Number.isNaN(lastPulse)) {
    return false;
  }

  const difference =
    (Date.now() - lastPulse) / 1000;


  // Consider device connected when a pulse
  // has been received within the last 30 seconds.

  return difference <= 30;
}


// =====================================================
// MACHINE OVERVIEW
// =====================================================

function MachineOverview({
  onLogout,
  onMachineSelect,
}) {

  // ---------------------------------------------------
  // LIVE MACHINE STATE
  // ---------------------------------------------------

  const [machines, setMachines] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);


  // ===================================================
  // LOAD LIVE MACHINE DATA
  // ===================================================

  const loadMachines =
    async () => {

      try {

        setError(null);


        // -----------------------------------------------
        // GET ACTUAL MACHINES FROM DATABASE
        // -----------------------------------------------

        const machineList =
          await getMachines();


        // -----------------------------------------------
        // GET RUNTIME + PRODUCTION FOR EACH MACHINE
        // -----------------------------------------------

        const liveMachines =
          await Promise.all(

            machineList.map(
              async (machine) => {

                const machineCode =
                  machine.machine_code ||
                  machine.machineCode;


                let runtime =
                  null;


                let productionRecords =
                  [];


                // -----------------------------------------
                // RUNTIME
                // -----------------------------------------

                try {

                  runtime =
                    await getMachineRuntime(
                      machineCode
                    );

                } catch (runtimeError) {

                  console.warn(
                    `Runtime unavailable for ${machineCode}`,
                    runtimeError
                  );

                }


                // -----------------------------------------
                // PRODUCTION
                // -----------------------------------------

                productionRecords =
                  await getMachineProduction(
                    machineCode
                  );


                // -----------------------------------------
                // TODAY'S PRODUCTION
                // -----------------------------------------

                const today =
                  new Date();

                const todayStart =
                  new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                  );


                const todayProductionRecords =
                  productionRecords.filter(
                    (record) => {

                      const timestamp =
                        record.timestamp ||
                        record.event_time;


                      if (!timestamp) {
                        return false;
                      }


                      const recordDate =
                        new Date(timestamp);


                      return (
                        recordDate >=
                        todayStart
                      );
                    }
                  );


                // -----------------------------------------
                // SUM CYCLE COUNT
                // -----------------------------------------

                const production =
                  todayProductionRecords.reduce(
                    (
                      total,
                      record
                    ) => {

                      return (
                        total +
                        (
                          Number(
                            record.cycle_count
                          ) || 0
                        )
                      );

                    },
                    0
                  );


                // -----------------------------------------
                // FALLBACK
                // -----------------------------------------

                const allProduction =
                  productionRecords.reduce(
                    (
                      total,
                      record
                    ) => {

                      return (
                        total +
                        (
                          Number(
                            record.cycle_count
                          ) || 0
                        )
                      );

                    },
                    0
                  );


                const finalProduction =
                  todayProductionRecords.length > 0
                    ? production
                    : allProduction;


                // -----------------------------------------
                // LATEST PRODUCTION RECORD
                // -----------------------------------------

                const latestProduction =
                  productionRecords.length > 0
                    ? productionRecords[0]
                    : null;


                const jobsPerMinute =
                  latestProduction
                    ? Number(
                        latestProduction.jobs_per_minute
                      ) || 0
                    : 0;


                // -----------------------------------------
                // LIVE STATUS
                // -----------------------------------------

                const status =
                  runtime?.current_status ||
                  "OFFLINE";


                // -----------------------------------------
                // CONNECTION
                // -----------------------------------------

                const connected =
                  isRecentlyConnected(
                    runtime?.last_pulse_time
                  );


                // -----------------------------------------
                // DOWNTIME
                // -----------------------------------------

                let downtime =
                  "--:--";


                if (
                  runtime?.downtime_start
                ) {

                  const downtimeSeconds =
                    (
                      Date.now() -
                      new Date(
                        runtime.downtime_start
                      ).getTime()
                    ) / 1000;


                  if (
                    downtimeSeconds >= 0
                  ) {

                    downtime =
                      formatDuration(
                        downtimeSeconds
                      );
                  }

                }


                // -----------------------------------------
                // RETURN LIVE MACHINE OBJECT
                // -----------------------------------------

                return {

                  id:
                    machine.id,

                  machineCode:
                    machineCode,

                  machineName:
                    machine.machine_name ||
                    machine.machineName ||
                    "Unnamed Machine",

                  machineType:
                    machine.machine_type ||
                    machine.machineType ||
                    "Power Press",

                  inputType:
                    machine.input_type ||
                    "Pulse",

                  status,

                  production:
                    finalProduction,

                  jobsPerMinute,

                  uptime:
                    status === "RUNNING"
                      ? "LIVE"
                      : "--:--",

                  downtime,

                  efficiency:
                    null,

                  deviceId:
                    runtime?.device_id ||
                    machine.device_id ||
                    "--",

                  connected,

                  lastPulseTime:
                    runtime?.last_pulse_time ||
                    null,

                  runtime,

                };

              }
            )
          );


        setMachines(
          liveMachines
        );


      } catch (loadError) {

        console.error(
          "Machine overview error:",
          loadError
        );


        setError(
          "Unable to load live machine data"
        );

      } finally {

        setLoading(false);

      }

    };


  // ===================================================
  // INITIAL LOAD + AUTO REFRESH
  // ===================================================

  useEffect(() => {

    loadMachines();


    const interval =
      setInterval(
        loadMachines,
        3000
      );


    return () =>
      clearInterval(interval);

  }, []);


  // ===================================================
  // SUMMARY
  // ===================================================

  const totalMachines =
    machines.length;


  const runningMachines =
    machines.filter(
      (machine) =>
        machine.status === "RUNNING"
    ).length;


  const idleMachines =
    machines.filter(
      (machine) =>
        machine.status === "IDLE"
    ).length;


  const downtimeMachines =
    machines.filter(
      (machine) =>
        machine.status === "DOWNTIME"
    ).length;


  const offlineMachines =
    machines.filter(
      (machine) =>
        machine.status === "OFFLINE"
    ).length;


  const connectedMachines =
    machines.filter(
      (machine) =>
        machine.connected
    ).length;


  const totalProduction =
    machines.reduce(
      (
        total,
        machine
      ) =>
        total +
        (
          Number(
            machine.production
          ) || 0
        ),
      0
    );


  // ===================================================
  // RENDER
  // ===================================================

  return (

    <div className="overview-page">


      {/* =============================================
          HEADER
      ============================================= */}

      <header className="overview-header">

        <div className="overview-brand">

          <div className="overview-brand-icon">

            <Factory size={21} />

          </div>


          <div>

            <h1>
              PowerPress
            </h1>

            <span>
              Production Monitoring System
            </span>

          </div>

        </div>


        <div className="overview-header-right">

          <div className="system-status">

            <span
              className="system-status-dot"
            ></span>

            System Online

          </div>


          <button
            className="header-icon-button"
            title="Settings"
          >

            <Settings size={18} />

          </button>


          <button
            className="logout-button"
            onClick={onLogout}
          >

            <LogOut size={16} />

            Logout

          </button>

        </div>

      </header>


      {/* =============================================
          MAIN
      ============================================= */}

      <main className="overview-main">


        {/* ===========================================
            PAGE HEADING
        =========================================== */}

        <section className="overview-heading">

          <div>

            <p className="section-label">
              PRODUCTION MONITORING
            </p>

            <h2>
              Machine Overview
            </h2>

            <p>
              Monitor production activity and
              machine performance in real time.
            </p>

          </div>


          <div className="overview-time">

            <span>
              MONITORING STATUS
            </span>

            <strong>
              {loading
                ? "Loading..."
                : "Live"}
            </strong>

          </div>

        </section>


        {/* ===========================================
            ERROR
        =========================================== */}

        {error && (

          <div
            style={{
              marginBottom: "20px",
              padding: "14px 18px",
              borderRadius: "10px",
              background: "#fee2e2",
              color: "#b91c1c",
              fontWeight: 600,
            }}
          >

            {error}

          </div>

        )}


        {/* ===========================================
            SUMMARY CARDS
        =========================================== */}

        <section className="overview-summary">


          <SummaryCard
            title="Total Machines"
            value={
              loading
                ? "..."
                : totalMachines
            }
            subtitle="Configured machines"
            icon={
              <Factory
                size={21}
              />
            }
            className="summary-blue"
          />


          <SummaryCard
            title="Running"
            value={
              loading
                ? "..."
                : runningMachines
            }
            subtitle="Machines producing"
            icon={
              <Activity
                size={21}
              />
            }
            className="summary-green"
          />


          <SummaryCard
            title="Idle / Downtime"
            value={
              loading
                ? "..."
                : (
                    idleMachines +
                    downtimeMachines
                  )
            }
            subtitle="Machines requiring attention"
            icon={
              <AlertTriangle
                size={21}
              />
            }
            className="summary-orange"
          />


          <SummaryCard
            title="Today's Production"
            value={
              loading
                ? "..."
                : totalProduction.toLocaleString()
            }
            subtitle="Total press cycles"
            icon={
              <Gauge
                size={21}
              />
            }
            className="summary-purple"
          />

        </section>


        {/* ===========================================
            MACHINE SECTION HEADER
        =========================================== */}

        <section className="machine-section-header">

          <div>

            <h3>
              All Machines
            </h3>

            <p>
              Select a machine to view detailed
              production information.
            </p>

          </div>


          <div className="machine-count">

            {loading
              ? "Loading..."
              : `${totalMachines} Machines`}

          </div>

        </section>


        {/* ===========================================
            MACHINE GRID
        =========================================== */}

        <section className="machine-grid">


          {!loading &&
            machines.length === 0 && (

              <div
                style={{
                  gridColumn:
                    "1 / -1",
                  padding: "40px",
                  textAlign: "center",
                  color: "#64748b",
                }}
              >

                No machines found
                in database.

              </div>

            )}


          {machines.map(
            (machine) => (

              <MachineCard
                key={
                  machine.id
                }
                machine={
                  machine
                }
                onSelect={() =>
                  onMachineSelect(
                    machine
                  )
                }
              />

            )
          )}

        </section>


        {/* ===========================================
            SYSTEM INFORMATION
        =========================================== */}

        <section className="system-information">


          <div className="system-information-item">

            {connectedMachines >
            0 ? (
              <Wifi
                size={18}
              />
            ) : (
              <WifiOff
                size={18}
              />
            )}


            <div>

              <strong>
                Connected Devices
              </strong>

              <span>

                {connectedMachines} of{" "}
                {totalMachines} ESP8266
                devices connected

              </span>

            </div>

          </div>


          <div className="system-information-item">

            <Activity
              size={18}
            />

            <div>

              <strong>
                Production Monitoring
              </strong>

              <span>
                Live machine monitoring active
              </span>

            </div>

          </div>

        </section>


      </main>

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
  icon,
  className,
}) {

  return (

    <div
      className={
        `summary-card ${className}`
      }
    >

      <div className="summary-card-top">

        <div>

          <span>
            {title}
          </span>

          <strong>
            {value}
          </strong>

        </div>


        <div className="summary-card-icon">

          {icon}

        </div>

      </div>


      <small>
        {subtitle}
      </small>

    </div>
  );
}


// =====================================================
// MACHINE CARD
// =====================================================

function MachineCard({
  machine,
  onSelect,
}) {

  const status =
    getStatusConfig(
      machine.status
    );


  const StatusIcon =
    status.icon;


  return (

    <button
      className="machine-card"
      onClick={onSelect}
    >


      {/* ===========================================
          CARD HEADER
      =========================================== */}

      <div className="machine-card-header">


        <div className="machine-card-title">


          <div className="machine-card-icon">

            <Factory
              size={20}
            />

          </div>


          <div>

            <h4>
              {machine.machineName}
            </h4>

            <span>
              {machine.machineCode}
            </span>

          </div>

        </div>


        <div
          className="device-indicator"
          title={
            machine.connected
              ? "ESP8266 connected"
              : "ESP8266 offline"
          }
        >

          {machine.connected ? (

            <Wifi
              size={15}
            />

          ) : (

            <WifiOff
              size={15}
            />

          )}

        </div>

      </div>


      {/* ===========================================
          STATUS
      =========================================== */}

      <div
        className="machine-status"
        style={{
          color:
            status.color,

          background:
            status.background,
        }}
      >

        <StatusIcon
          size={15}
        />

        {status.label}

      </div>


      {/* ===========================================
          PRODUCTION
      =========================================== */}

      <div className="machine-production">

        <span>
          Today's Production
        </span>


        <strong>

          {(
            Number(
              machine.production
            ) || 0
          ).toLocaleString()}

        </strong>

      </div>


      {/* ===========================================
          STATISTICS
      =========================================== */}

      <div className="machine-stats">


        <div>

          <span>
            Jobs / Min
          </span>

          <strong>

            {machine.jobsPerMinute
              ? machine.jobsPerMinute
              : "0"}

          </strong>

        </div>


        <div>

          <span>
            Efficiency
          </span>

          <strong>
            {machine.efficiency !== null
              ? `${machine.efficiency}%`
              : "—"}
          </strong>

        </div>


        <div>

          <span>
            Uptime
          </span>

          <strong>
            {machine.uptime}
          </strong>

        </div>


        <div>

          <span>
            Downtime
          </span>

          <strong>
            {machine.downtime}
          </strong>

        </div>

      </div>


      {/* ===========================================
          CARD FOOTER
      =========================================== */}

      <div className="machine-card-footer">

        <span>
          {machine.deviceId}
        </span>


        <span className="view-machine">
          View Details →
        </span>

      </div>


    </button>
  );
}


export default MachineOverview;