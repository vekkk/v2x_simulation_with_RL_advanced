import { CONFIG } from '../config/config.js';

export class PlotManager {
    constructor() {
        this.episodeCount = 0;
        this.episodeStartTime = Date.now();
        this.episodeDuration = 30000; // 30 seconds per episode
        
        // Data storage for plots
        this.rewardHistory = [];
        this.prrHistory = [];
        this.messageTypePRR = {
            SAFETY_MESSAGE: [],
            BASIC_CAM_MESSAGE: [],
            TRAFFIC_MESSAGE: [],
            INFOTAINMENT_MESSAGE: []
        };
        this.latencyHistory = [];
        this.networkEfficiencyHistory = [];
        
        // Current episode data
        this.currentEpisodeData = {
            totalReward: 0,
            packetsReceived: 0,
            packetsSent: 0,
            messageTypeStats: {
                SAFETY_MESSAGE: { sent: 0, received: 0 },
                BASIC_CAM_MESSAGE: { sent: 0, received: 0 },
                TRAFFIC_MESSAGE: { sent: 0, received: 0 },
                INFOTAINMENT_MESSAGE: { sent: 0, received: 0 }
            },
            totalLatency: 0,
            latencyCount: 0
        };
        
        // Flag to track if plots are initialized
        this.plotsInitialized = false;
        
        console.log('PlotManager initialized - plots will be created when analytics are enabled');
    }

    initializePlots() {
        // Only create plots if analytics are enabled
        if (!this.isAnalyticsEnabled()) {
            console.log('Analytics disabled - skipping plot creation');
            return;
        }
        
        if (this.plotsInitialized) {
            console.log('Plots already initialized');
            return;
        }
        
        // Create plot containers in the UI
        this.createPlotContainers();
        
        // Initialize Chart.js plots
        this.initializeCharts();
        
        this.plotsInitialized = true;
        console.log('📊 Analytics plots initialized');
    }
    
    isAnalyticsEnabled() {
        // Check if analytics are enabled via the global function
        return typeof window.isAnalyticsEnabled === 'function' && window.isAnalyticsEnabled();
    }

    createPlotContainers() {
        // Check if analytics panel already exists
        if (document.getElementById('analytics-panel')) {
            return;
        }
        
        // Create analytics panel in HTML
        const analyticsPanel = document.createElement('div');
        analyticsPanel.id = 'analytics-panel';
        analyticsPanel.className = 'panel';
        analyticsPanel.innerHTML = `
            <h3>📊 Performance Analytics</h3>
            <div class="analytics-grid">
                <div class="plot-container">
                    <h4>Reward vs Training Episode</h4>
                    <canvas id="reward-plot" width="300" height="200"></canvas>
                </div>
                <div class="plot-container">
                    <h4>Overall PRR vs Episode</h4>
                    <canvas id="prr-plot" width="300" height="200"></canvas>
                </div>
                <div class="plot-container">
                    <h4>Safety Message PRR vs Episode</h4>
                    <canvas id="safety-prr-plot" width="300" height="200"></canvas>
                </div>
                <div class="plot-container">
                    <h4>Traffic Message PRR vs Episode</h4>
                    <canvas id="traffic-prr-plot" width="300" height="200"></canvas>
                </div>
                <div class="plot-container">
                    <h4>Network Efficiency vs Episode</h4>
                    <canvas id="efficiency-plot" width="300" height="200"></canvas>
                </div>
                <div class="plot-container">
                    <h4>Average Latency vs Episode</h4>
                    <canvas id="latency-plot" width="300" height="200"></canvas>
                </div>
            </div>
            <div class="episode-info">
                <span>Current Episode: <span id="current-episode">1</span></span>
                <span>Episode Progress: <span id="episode-progress">0%</span></span>
                <div class="analytics-controls">
                    <button id="reset-analytics" onclick="plotManager.resetAnalytics()">🔄 Reset Analytics</button>
                    <button id="export-data" onclick="plotManager.exportData()">📥 Download JSON</button>
                    <button id="export-csv" onclick="plotManager.exportCSV()">📊 Download CSV</button>
                    <button id="export-charts" onclick="plotManager.exportCharts()">📈 Download Charts</button>
                </div>
            </div>
        `;
        
        // Insert after the existing panels
        const controlsPanel = document.querySelector('.controls-panel');
        if (controlsPanel) {
            controlsPanel.parentNode.insertBefore(analyticsPanel, controlsPanel.nextSibling);
        }
    }

    initializeCharts() {
        // Load Chart.js library dynamically
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => this.createCharts();
            document.head.appendChild(script);
        } else {
            this.createCharts();
        }
    }

    createCharts() {
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Training Episode'
                    }
                },
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        };

        // Reward Chart
        const rewardCtx = document.getElementById('reward-plot');
        if (rewardCtx) {
            this.rewardChart = new Chart(rewardCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Average Reward',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1
                    }]
                },
                options: {
                    ...chartOptions,
                    scales: {
                        ...chartOptions.scales,
                        y: {
                            title: {
                                display: true,
                                text: 'Average Reward'
                            }
                        }
                    }
                }
            });
        }

        // PRR Chart
        const prrCtx = document.getElementById('prr-plot');
        if (prrCtx) {
            this.prrChart = new Chart(prrCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Packet Reception Rate',
                        data: [],
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.1
                    }]
                },
                options: {
                    ...chartOptions,
                    scales: {
                        ...chartOptions.scales,
                        y: {
                            title: {
                                display: true,
                                text: 'PRR (%)'
                            },
                            min: 0,
                            max: 100
                        }
                    }
                }
            });
        }

        // Safety PRR Chart
        const safetyPrrCtx = document.getElementById('safety-prr-plot');
        if (safetyPrrCtx) {
            this.safetyPrrChart = new Chart(safetyPrrCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Safety Message PRR',
                        data: [],
                        borderColor: 'rgb(255, 206, 86)',
                        backgroundColor: 'rgba(255, 206, 86, 0.2)',
                        tension: 0.1
                    }]
                },
                options: {
                    ...chartOptions,
                    scales: {
                        ...chartOptions.scales,
                        y: {
                            title: {
                                display: true,
                                text: 'Safety PRR (%)'
                            },
                            min: 80,
                            max: 100
                        }
                    }
                }
            });
        }

        // Traffic PRR Chart
        const trafficPrrCtx = document.getElementById('traffic-prr-plot');
        if (trafficPrrCtx) {
            this.trafficPrrChart = new Chart(trafficPrrCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Traffic Message PRR',
                        data: [],
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        tension: 0.1
                    }]
                },
                options: {
                    ...chartOptions,
                    scales: {
                        ...chartOptions.scales,
                        y: {
                            title: {
                                display: true,
                                text: 'Traffic PRR (%)'
                            },
                            min: 70,
                            max: 100
                        }
                    }
                }
            });
        }

        // Network Efficiency Chart
        const efficiencyCtx = document.getElementById('efficiency-plot');
        if (efficiencyCtx) {
            this.efficiencyChart = new Chart(efficiencyCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Network Efficiency',
                        data: [],
                        borderColor: 'rgb(153, 102, 255)',
                        backgroundColor: 'rgba(153, 102, 255, 0.2)',
                        tension: 0.1
                    }]
                },
                options: {
                    ...chartOptions,
                    scales: {
                        ...chartOptions.scales,
                        y: {
                            title: {
                                display: true,
                                text: 'Efficiency (%)'
                            },
                            min: 0,
                            max: 100
                        }
                    }
                }
            });
        }

        // Latency Chart
        const latencyCtx = document.getElementById('latency-plot');
        if (latencyCtx) {
            this.latencyChart = new Chart(latencyCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Average Latency',
                        data: [],
                        borderColor: 'rgb(255, 159, 64)',
                        backgroundColor: 'rgba(255, 159, 64, 0.2)',
                        tension: 0.1
                    }]
                },
                options: {
                    ...chartOptions,
                    scales: {
                        ...chartOptions.scales,
                        y: {
                            title: {
                                display: true,
                                text: 'Latency (ms)'
                            },
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        console.log('Performance analytics charts initialized');
    }

    // Called by NetworkManager to record packet transmission
    recordPacketTransmission(messageType, networkType, success, latency, reward) {
        // Update current episode data
        this.currentEpisodeData.packetsSent++;
        this.currentEpisodeData.messageTypeStats[messageType].sent++;
        
        if (success) {
            this.currentEpisodeData.packetsReceived++;
            this.currentEpisodeData.messageTypeStats[messageType].received++;
            this.currentEpisodeData.totalLatency += latency;
            this.currentEpisodeData.latencyCount++;
        }
        
        this.currentEpisodeData.totalReward += reward;
    }

    // Called by AI to record learning progress
    recordLearningStep(reward, epsilon, qTableSize) {
        this.currentEpisodeData.totalReward += reward;
    }

    // Check if episode should end and process data
    update() {
        // Only process if analytics are enabled
        if (!this.isAnalyticsEnabled()) {
            return;
        }
        
        // Initialize plots if not already done and analytics are enabled
        if (!this.plotsInitialized) {
            this.initializePlots();
        }
        
        const currentTime = Date.now();
        const episodeProgress = (currentTime - this.episodeStartTime) / this.episodeDuration;
        
        // Update episode progress display
        const progressElement = document.getElementById('episode-progress');
        if (progressElement) {
            progressElement.textContent = `${Math.min(100, Math.round(episodeProgress * 100))}%`;
        }
        
        // Check if episode is complete
        if (currentTime - this.episodeStartTime >= this.episodeDuration) {
            this.completeEpisode();
        }
    }

    completeEpisode() {
        // Only process if analytics are enabled
        if (!this.isAnalyticsEnabled()) {
            return;
        }
        
        this.episodeCount++;
        
        // Calculate episode metrics
        const overallPRR = this.currentEpisodeData.packetsSent > 0 ? 
            (this.currentEpisodeData.packetsReceived / this.currentEpisodeData.packetsSent) * 100 : 0;
        
        const averageReward = this.currentEpisodeData.totalReward / Math.max(1, this.currentEpisodeData.packetsSent);
        
        const averageLatency = this.currentEpisodeData.latencyCount > 0 ? 
            this.currentEpisodeData.totalLatency / this.currentEpisodeData.latencyCount : 0;
        
        // Calculate message-type specific PRRs
        const safetyPRR = this.calculateMessageTypePRR('SAFETY_MESSAGE');
        const trafficPRR = this.calculateMessageTypePRR('TRAFFIC_MESSAGE');
        const camPRR = this.calculateMessageTypePRR('BASIC_CAM_MESSAGE');
        const infoPRR = this.calculateMessageTypePRR('INFOTAINMENT_MESSAGE');
        
        // Calculate network efficiency (successful high-priority messages / total high-priority attempts)
        const highPriorityReceived = this.currentEpisodeData.messageTypeStats.SAFETY_MESSAGE.received + 
                                   this.currentEpisodeData.messageTypeStats.BASIC_CAM_MESSAGE.received;
        const highPrioritySent = this.currentEpisodeData.messageTypeStats.SAFETY_MESSAGE.sent + 
                               this.currentEpisodeData.messageTypeStats.BASIC_CAM_MESSAGE.sent;
        const networkEfficiency = highPrioritySent > 0 ? (highPriorityReceived / highPrioritySent) * 100 : 0;
        
        // Store episode data
        this.rewardHistory.push(averageReward);
        this.prrHistory.push(overallPRR);
        this.messageTypePRR.SAFETY_MESSAGE.push(safetyPRR);
        this.messageTypePRR.TRAFFIC_MESSAGE.push(trafficPRR);
        this.messageTypePRR.BASIC_CAM_MESSAGE.push(camPRR);
        this.messageTypePRR.INFOTAINMENT_MESSAGE.push(infoPRR);
        this.latencyHistory.push(averageLatency);
        this.networkEfficiencyHistory.push(networkEfficiency);
        
        // Update charts
        this.updateCharts();
        
        // Log episode summary
        console.log(`Episode ${this.episodeCount} Complete:`, {
            averageReward: averageReward.toFixed(2),
            overallPRR: overallPRR.toFixed(1) + '%',
            safetyPRR: safetyPRR.toFixed(1) + '%',
            trafficPRR: trafficPRR.toFixed(1) + '%',
            averageLatency: averageLatency.toFixed(1) + 'ms',
            networkEfficiency: networkEfficiency.toFixed(1) + '%'
        });
        
        // Reset for next episode
        this.resetCurrentEpisodeData();
        this.episodeStartTime = Date.now();
        
        // Update episode counter display
        const episodeElement = document.getElementById('current-episode');
        if (episodeElement) {
            episodeElement.textContent = this.episodeCount + 1;
        }
    }

    calculateMessageTypePRR(messageType) {
        const stats = this.currentEpisodeData.messageTypeStats[messageType];
        return stats.sent > 0 ? (stats.received / stats.sent) * 100 : 0;
    }

    updateCharts() {
        // Only update charts if analytics are enabled and plots are initialized
        if (!this.isAnalyticsEnabled() || !this.plotsInitialized) {
            return;
        }
        
        const episodes = Array.from({length: this.episodeCount}, (_, i) => i + 1);
        
        // Update Reward Chart
        if (this.rewardChart) {
            this.rewardChart.data.labels = episodes;
            this.rewardChart.data.datasets[0].data = this.rewardHistory;
            this.rewardChart.update('none');
        }
        
        // Update PRR Chart
        if (this.prrChart) {
            this.prrChart.data.labels = episodes;
            this.prrChart.data.datasets[0].data = this.prrHistory;
            this.prrChart.update('none');
        }
        
        // Update Safety PRR Chart
        if (this.safetyPrrChart) {
            this.safetyPrrChart.data.labels = episodes;
            this.safetyPrrChart.data.datasets[0].data = this.messageTypePRR.SAFETY_MESSAGE;
            this.safetyPrrChart.update('none');
        }
        
        // Update Traffic PRR Chart
        if (this.trafficPrrChart) {
            this.trafficPrrChart.data.labels = episodes;
            this.trafficPrrChart.data.datasets[0].data = this.messageTypePRR.TRAFFIC_MESSAGE;
            this.trafficPrrChart.update('none');
        }
        
        // Update Efficiency Chart
        if (this.efficiencyChart) {
            this.efficiencyChart.data.labels = episodes;
            this.efficiencyChart.data.datasets[0].data = this.networkEfficiencyHistory;
            this.efficiencyChart.update('none');
        }
        
        // Update Latency Chart
        if (this.latencyChart) {
            this.latencyChart.data.labels = episodes;
            this.latencyChart.data.datasets[0].data = this.latencyHistory;
            this.latencyChart.update('none');
        }
    }

    resetCurrentEpisodeData() {
        this.currentEpisodeData = {
            totalReward: 0,
            packetsReceived: 0,
            packetsSent: 0,
            messageTypeStats: {
                SAFETY_MESSAGE: { sent: 0, received: 0 },
                BASIC_CAM_MESSAGE: { sent: 0, received: 0 },
                TRAFFIC_MESSAGE: { sent: 0, received: 0 },
                INFOTAINMENT_MESSAGE: { sent: 0, received: 0 }
            },
            totalLatency: 0,
            latencyCount: 0
        };
    }

    resetAnalytics() {
        // Clear all data
        this.episodeCount = 0;
        this.rewardHistory = [];
        this.prrHistory = [];
        this.messageTypePRR = {
            SAFETY_MESSAGE: [],
            BASIC_CAM_MESSAGE: [],
            TRAFFIC_MESSAGE: [],
            INFOTAINMENT_MESSAGE: []
        };
        this.latencyHistory = [];
        this.networkEfficiencyHistory = [];
        
        this.resetCurrentEpisodeData();
        this.episodeStartTime = Date.now();
        
        // Clear charts
        if (this.rewardChart) {
            this.rewardChart.data.labels = [];
            this.rewardChart.data.datasets[0].data = [];
            this.rewardChart.update();
        }
        
        if (this.prrChart) {
            this.prrChart.data.labels = [];
            this.prrChart.data.datasets[0].data = [];
            this.prrChart.update();
        }
        
        if (this.safetyPrrChart) {
            this.safetyPrrChart.data.labels = [];
            this.safetyPrrChart.data.datasets[0].data = [];
            this.safetyPrrChart.update();
        }
        
        if (this.trafficPrrChart) {
            this.trafficPrrChart.data.labels = [];
            this.trafficPrrChart.data.datasets[0].data = [];
            this.trafficPrrChart.update();
        }
        
        if (this.efficiencyChart) {
            this.efficiencyChart.data.labels = [];
            this.efficiencyChart.data.datasets[0].data = [];
            this.efficiencyChart.update();
        }
        
        if (this.latencyChart) {
            this.latencyChart.data.labels = [];
            this.latencyChart.data.datasets[0].data = [];
            this.latencyChart.update();
        }
        
        // Reset UI
        const episodeElement = document.getElementById('current-episode');
        if (episodeElement) {
            episodeElement.textContent = '1';
        }
        
        const progressElement = document.getElementById('episode-progress');
        if (progressElement) {
            progressElement.textContent = '0%';
        }
        
        console.log('Analytics reset');
    }

    // Export data for further analysis
    exportData() {
        const data = {
            episodes: this.episodeCount,
            rewardHistory: this.rewardHistory,
            prrHistory: this.prrHistory,
            messageTypePRR: this.messageTypePRR,
            latencyHistory: this.latencyHistory,
            networkEfficiencyHistory: this.networkEfficiencyHistory,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `v2x_analytics_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('Analytics data exported as JSON');
    }
    
    exportCSV() {
        // Create CSV data
        let csvContent = "Episode,Average_Reward,Overall_PRR,Safety_PRR,CAM_PRR,Traffic_PRR,Info_PRR,Avg_Latency,Network_Efficiency\n";
        
        const maxLength = Math.max(
            this.rewardHistory.length,
            this.prrHistory.length,
            this.latencyHistory.length,
            this.networkEfficiencyHistory.length
        );
        
        for (let i = 0; i < maxLength; i++) {
            const episode = i + 1;
            const reward = this.rewardHistory[i] || 0;
            const prr = this.prrHistory[i] || 0;
            const safetyPRR = this.messageTypePRR.SAFETY_MESSAGE[i] || 0;
            const camPRR = this.messageTypePRR.BASIC_CAM_MESSAGE[i] || 0;
            const trafficPRR = this.messageTypePRR.TRAFFIC_MESSAGE[i] || 0;
            const infoPRR = this.messageTypePRR.INFOTAINMENT_MESSAGE[i] || 0;
            const latency = this.latencyHistory[i] || 0;
            const efficiency = this.networkEfficiencyHistory[i] || 0;
            
            csvContent += `${episode},${reward},${prr},${safetyPRR},${camPRR},${trafficPRR},${infoPRR},${latency},${efficiency}\n`;
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `v2x_analytics_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('Analytics data exported as CSV');
    }
    
    exportCharts() {
        // Export all charts as images
        const charts = [
            { chart: this.rewardChart, name: 'reward_chart' },
            { chart: this.prrChart, name: 'prr_chart' },
            { chart: this.safetyPrrChart, name: 'safety_prr_chart' },
            { chart: this.trafficPrrChart, name: 'traffic_prr_chart' },
            { chart: this.efficiencyChart, name: 'efficiency_chart' },
            { chart: this.latencyChart, name: 'latency_chart' }
        ];
        
        charts.forEach(({ chart, name }) => {
            if (chart) {
                const url = chart.toBase64Image();
                const a = document.createElement('a');
                a.href = url;
                a.download = `${name}_${Date.now()}.png`;
                a.click();
            }
        });
        
        console.log('Charts exported as PNG images');
    }
} 