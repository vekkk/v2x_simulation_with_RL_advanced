export const NETWORK_PARAMETERS = {
    GENERIC_CELLULAR: {
        latencyMs: 500,       // 0.5 seconds latency
        packetLossRate: 0.05, // 5% packet loss
        range: 100           // 100 units communication range
    },
    // Future network types can be added here
    // 5G: {
    //     latencyMs: 50,
    //     packetLossRate: 0.01,
    //     range: 150
    // },
    // 4G: {
    //     latencyMs: 100,
    //     packetLossRate: 0.03,
    //     range: 120
    // }
}; 