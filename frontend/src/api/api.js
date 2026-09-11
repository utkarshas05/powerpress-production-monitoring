const API_BASE_URL = "";


// =====================================================
// GET ALL MACHINES
// =====================================================

export async function getMachines() {

    const response = await fetch(
        `${API_BASE_URL}/api/machines`
    );

    if (!response.ok) {
        throw new Error("Failed to fetch machines");
    }

    const data = await response.json();

    return data.machines;
}


// =====================================================
// GET SINGLE MACHINE
// =====================================================

export async function getMachine(machineCode) {

    const response = await fetch(
        `${API_BASE_URL}/api/machines/${machineCode}`
    );

    if (!response.ok) {
        throw new Error("Failed to fetch machine");
    }

    const data = await response.json();

    return data.machine;
}


// =====================================================
// GET MACHINE RUNTIME STATE
// =====================================================

export async function getMachineRuntime(machineCode) {

    const response = await fetch(
        `${API_BASE_URL}/api/machines/${machineCode}/runtime`
    );

    if (!response.ok) {
        throw new Error("Failed to fetch machine runtime");
    }

    const data = await response.json();

    return data.runtime;
}


// =====================================================
// GET MACHINE PRODUCTION
// =====================================================

export async function getMachineProduction(machineCode) {

    const response = await fetch(
        `${API_BASE_URL}/api/machines/${machineCode}/production`
    );

    if (!response.ok) {
        throw new Error("Failed to fetch machine production");
    }

    const data = await response.json();

    return data.production || [];
}


// =====================================================
// GET MACHINE EVENTS
// =====================================================

export async function getMachineEvents(machineCode) {

    const response = await fetch(
        `${API_BASE_URL}/api/machines/${machineCode}/events`
    );

    if (!response.ok) {
        throw new Error("Failed to fetch machine events");
    }

    const data = await response.json();

    return data.events || [];
}


// =====================================================
// GET MACHINE DOWNTIME
// =====================================================

export async function getMachineDowntime(machineCode) {

    const response = await fetch(
        `${API_BASE_URL}/api/machines/${machineCode}/downtime`
    );

    if (!response.ok) {
        throw new Error("Failed to fetch machine downtime");
    }

    const data = await response.json();

    return data.downtime || [];
}