const { createApp } = Vue;

createApp({
    data() {
        return {
            selectedFile: null,
            fileContents: null,
            parsedData: null,
            columns: [],
            rows: [],
            totalRows: 0,
            agentStatistics: {},
            aggregateStatistics: {},
            loading: false,
            sortColumn: null,
            sortDirection: 'asc',
            searchQuery: '',
            selectedAgent: null,
            selectedVerificationTypes: [],
            allVerificationTypes: [],
            expandedMetric: null,
            expandedAgent: null,
            expandedSections: {
                aggregateStatistics: true,
                agentComparison: true,
                parsedData: false
            },
            audioPlayer: {
                visible: false,
                url: null,
                rowIndex: null
            },
            agentDrawerSortColumn: null,
            agentDrawerSortDirection: 'asc',
            agentDrawerFilterVerificationType: null,
            agentDrawerFilterCompleted: null
        };
    },
    mounted() {
        // Add escape key listener for closing drawer and audio player
        document.addEventListener('keydown', this.handleEscapeKey);
    },
    beforeUnmount() {
        // Remove escape key listener
        document.removeEventListener('keydown', this.handleEscapeKey);
    },
    computed: {
        filteredRows() {
            if (!this.rows || this.rows.length === 0) {
                return [];
            }
            if (!this.selectedVerificationTypes || this.selectedVerificationTypes.length === 0) {
                return [];
            }
            return this.rows.filter(row => {
                const verificationType = row.verification_type || '';
                return this.selectedVerificationTypes.includes(verificationType);
            });
        },
        filteredAgentStatistics() {
            if (!this.filteredRows || this.filteredRows.length === 0) {
                return {};
            }
            return this.calculateStatisticsFromRows(this.filteredRows);
        },
        filteredAggregateStatistics() {
            if (!this.filteredRows || this.filteredRows.length === 0) {
                return {};
            }
            return this.calculateAggregateStatisticsFromRows(this.filteredRows, this.filteredAgentStatistics);
        },
        sortedAgents() {
            const stats = this.filteredAgentStatistics;
            if (!stats || Object.keys(stats).length === 0) {
                return [];
            }
            
            let agents = Object.keys(stats).map(agent => ({
                name: agent,
                ...stats[agent]
            }));
            
            // Filter by search query
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                agents = agents.filter(agent => 
                    agent.name.toLowerCase().includes(query)
                );
            }
            
            // Sort
            if (this.sortColumn) {
                agents.sort((a, b) => {
                    let aVal, bVal;
                    
                    if (this.sortColumn === 'name') {
                        aVal = a.name;
                        bVal = b.name;
                    } else if (this.sortColumn === 'total_calls') {
                        aVal = a.total_calls || 0;
                        bVal = b.total_calls || 0;
                    } else if (this.sortColumn === 'completed_calls') {
                        aVal = a.completed_calls || 0;
                        bVal = b.completed_calls || 0;
                    } else if (this.sortColumn.endsWith('_score')) {
                        // Sort by metric score (average)
                        const metric = this.sortColumn.replace('_score', '');
                        aVal = a.metrics && a.metrics[metric] ? a.metrics[metric].average : 0;
                        bVal = b.metrics && b.metrics[metric] ? b.metrics[metric].average : 0;
                    } else if (this.sortColumn.endsWith('_flags')) {
                        // Sort by metric flags
                        const metric = this.sortColumn.replace('_flags', '');
                        aVal = a.metrics && a.metrics[metric] ? a.metrics[metric].flags : 0;
                        bVal = b.metrics && b.metrics[metric] ? b.metrics[metric].flags : 0;
                    } else {
                        // Fallback: sort by metric average
                        aVal = a.metrics && a.metrics[this.sortColumn] ? a.metrics[this.sortColumn].average : 0;
                        bVal = b.metrics && b.metrics[this.sortColumn] ? b.metrics[this.sortColumn].average : 0;
                    }
                    
                    if (this.sortDirection === 'asc') {
                        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                    } else {
                        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
                    }
                });
            }
            
            return agents;
        },
        availableMetrics() {
            const stats = this.filteredAggregateStatistics;
            if (!stats || !stats.overall_metrics) {
                return [];
            }
            return Object.keys(stats.overall_metrics);
        },
        comparisonMetrics() {
            // Only show these 4 specific metrics in the comparison table
            return ['correct_inputs', 'confirmed_company', 'call_recorded', 'followed_script'];
        },
        sortedAndFilteredAgentCalls() {
            if (!this.expandedAgent) {
                return [];
            }
            let calls = this.getAgentCalls(this.expandedAgent);
            
            // Apply filters
            if (this.agentDrawerFilterVerificationType) {
                calls = calls.filter(row => {
                    return (row.verification_type || '') === this.agentDrawerFilterVerificationType;
                });
            }
            
            if (this.agentDrawerFilterCompleted !== null) {
                calls = calls.filter(row => {
                    const isCompleted = (row.call_type || '').trim() === 'completed_verification';
                    return isCompleted === this.agentDrawerFilterCompleted;
                });
            }
            
            // Apply sorting
            if (this.agentDrawerSortColumn) {
                calls = [...calls].sort((a, b) => {
                    let aVal, bVal;
                    
                    switch (this.agentDrawerSortColumn) {
                        case 'applicant_name':
                            aVal = (a.applicant_name || '').toLowerCase();
                            bVal = (b.applicant_name || '').toLowerCase();
                            break;
                        case 'verification_type':
                            aVal = (a.verification_type || '').toLowerCase();
                            bVal = (b.verification_type || '').toLowerCase();
                            break;
                        case 'completed_verification':
                            aVal = (a.call_type || '').trim() === 'completed_verification' ? 1 : 0;
                            bVal = (b.call_type || '').trim() === 'completed_verification' ? 1 : 0;
                            break;
                        case 'correct_inputs':
                        case 'confirmed_company':
                        case 'call_recorded':
                        case 'followed_script':
                            aVal = this.parseNumeric(a[this.agentDrawerSortColumn]);
                            bVal = this.parseNumeric(b[this.agentDrawerSortColumn]);
                            // Treat null as -1 for sorting (so nulls go to end)
                            if (aVal === null) aVal = -1;
                            if (bVal === null) bVal = -1;
                            break;
                        case 'duration':
                            // Parse duration as seconds (HH:MM:SS format)
                            aVal = this.parseDuration(a.call_duration);
                            bVal = this.parseDuration(b.call_duration);
                            if (aVal === null) aVal = -1;
                            if (bVal === null) bVal = -1;
                            break;
                        default:
                            aVal = a[this.agentDrawerSortColumn] || '';
                            bVal = b[this.agentDrawerSortColumn] || '';
                    }
                    
                    if (aVal < bVal) {
                        return this.agentDrawerSortDirection === 'asc' ? -1 : 1;
                    }
                    if (aVal > bVal) {
                        return this.agentDrawerSortDirection === 'asc' ? 1 : -1;
                    }
                    return 0;
                });
            }
            
            return calls;
        }
    },
    methods: {
        handleFileSelect(event) {
            this.selectedFile = event.target.files[0];
        },
        async uploadFile() {
            if (!this.selectedFile) {
                return;
            }
            
            this.loading = true;
            this.parsedData = null;
            this.columns = [];
            this.rows = [];
            this.totalRows = 0;
            this.agentStatistics = {};
            this.aggregateStatistics = {};
            
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            
            try {
                const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                const response = await fetch('/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': csrfToken
                    }
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    this.parsedData = data;
                    this.columns = data.columns || [];
                    this.rows = data.rows || [];
                    this.totalRows = data.total_rows || 0;
                    this.agentStatistics = data.agent_statistics || {};
                    this.aggregateStatistics = data.aggregate_statistics || {};
                    
                    // Extract unique verification types and set all as selected by default
                    const verificationTypes = [...new Set(this.rows.map(row => row.verification_type).filter(Boolean))];
                    this.allVerificationTypes = verificationTypes;
                    this.selectedVerificationTypes = [...verificationTypes];
                } else {
                    alert(data.error || 'Error uploading file. Please try again.');
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                alert('Error uploading file. Please try again.');
            } finally {
                this.loading = false;
            }
        },
        sortBy(column) {
            if (this.sortColumn === column) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortColumn = column;
                this.sortDirection = 'asc';
            }
        },
        getSortIcon(column) {
            if (this.sortColumn !== column) {
                return '↕️';
            }
            return this.sortDirection === 'asc' ? '↑' : '↓';
        },
        getMetricValue(agent, metric) {
            if (!agent.metrics || !agent.metrics[metric]) {
                return '-';
            }
            return agent.metrics[metric].average;
        },
        getMetricScore(agent, metric) {
            if (!agent.metrics || !agent.metrics[metric]) {
                return '-';
            }
            return agent.metrics[metric].average;
        },
        getMetricFlags(agent, metric) {
            if (!agent.metrics || !agent.metrics[metric]) {
                return '-';
            }
            return agent.metrics[metric].flags || 0;
        },
        formatMetricName(metric) {
            return metric.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        },
        selectAgent(agentName) {
            this.selectedAgent = this.selectedAgent === agentName ? null : agentName;
            // Close metric drawer if open, then toggle agent drawer
            if (this.expandedMetric) {
                this.expandedMetric = null;
            }
            const wasOpen = this.expandedAgent === agentName;
            this.expandedAgent = this.expandedAgent === agentName ? null : agentName;
            // Reset filters and sort when opening drawer
            if (!wasOpen && this.expandedAgent) {
                this.agentDrawerSortColumn = null;
                this.agentDrawerSortDirection = 'asc';
                this.agentDrawerFilterVerificationType = null;
                this.agentDrawerFilterCompleted = null;
            }
        },
        sortAgentDrawerBy(column) {
            if (this.agentDrawerSortColumn === column) {
                this.agentDrawerSortDirection = this.agentDrawerSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.agentDrawerSortColumn = column;
                this.agentDrawerSortDirection = 'asc';
            }
        },
        getAgentDrawerSortIcon(column) {
            if (this.agentDrawerSortColumn !== column) {
                return '↕️';
            }
            return this.agentDrawerSortDirection === 'asc' ? '↑' : '↓';
        },
        parseDuration(duration) {
            if (!duration || typeof duration !== 'string') {
                return null;
            }
            // Parse HH:MM:SS format to seconds
            const parts = duration.trim().split(':');
            if (parts.length !== 3) {
                return null;
            }
            const hours = parseInt(parts[0], 10);
            const minutes = parseInt(parts[1], 10);
            const seconds = parseInt(parts[2], 10);
            if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
                return null;
            }
            return hours * 3600 + minutes * 60 + seconds;
        },
        getAgentCalls(agentName) {
            if (!this.filteredRows || this.filteredRows.length === 0 || !agentName) {
                return [];
            }
            return this.filteredRows.filter(row => {
                const rowAgent = row.agent || 'Unknown';
                return rowAgent === agentName;
            });
        },
        getMetricValueForCall(row, metric) {
            const value = this.parseNumeric(row[metric]);
            if (value === null) {
                return '-';
            }
            // For metrics that require completed_verification, check call_type
            const requiresCompletedVerification = ['correct_inputs', 'confirmed_company', 'call_recorded', 'followed_script'];
            if (requiresCompletedVerification.includes(metric)) {
                const callType = (row.call_type || '').trim();
                if (callType !== 'completed_verification') {
                    return '-';
                }
            }
            return value;
        },
        toggleSection(section) {
            this.expandedSections[section] = !this.expandedSections[section];
        },
        toggleMetricExpansion(metric) {
            // Close agent drawer if open, then toggle metric drawer
            if (this.expandedAgent) {
                this.expandedAgent = null;
            }
            this.expandedMetric = this.expandedMetric === metric ? null : metric;
        },
        handleEscapeKey(event) {
            if (event.key === 'Escape') {
                if (this.expandedAgent) {
                    this.expandedAgent = null;
                } else if (this.expandedMetric) {
                    this.expandedMetric = null;
                }
            }
        },
        toggleAudioPlayer(rowIndex, url) {
            if (this.audioPlayer.visible && this.audioPlayer.rowIndex === rowIndex) {
                // Close if clicking the same row
                this.closeAudioPlayer();
            } else {
                // Pause any currently playing audio
                const currentAudio = document.querySelector('.audio-player-inline');
                if (currentAudio) {
                    currentAudio.pause();
                }
                // Open new player
                this.audioPlayer = {
                    visible: true,
                    url: url,
                    rowIndex: rowIndex
                };
            }
        },
        closeAudioPlayer() {
            // Pause audio if playing
            const audioEl = document.querySelector('.audio-player-inline');
            if (audioEl) {
                audioEl.pause();
            }
            this.audioPlayer = {
                visible: false,
                url: null,
                rowIndex: null
            };
        },
        onAudioLoaded() {
            // Audio metadata loaded - can add additional logic here if needed
        },
        getAgentFlagsSummary(metric) {
            if (!this.filteredRows || this.filteredRows.length === 0) {
                return [];
            }
            
            const requiresCompletedVerification = ['correct_inputs', 'confirmed_company', 'call_recorded', 'followed_script'];
            
            // Get all calls that contribute to the metric's Count (where metric value is not null)
            const totalCalls = this.filteredRows.filter(row => {
                if (requiresCompletedVerification.includes(metric)) {
                    const callType = (row.call_type || '').trim();
                    if (callType !== 'completed_verification') {
                        return false;
                    }
                }
                
                const value = this.parseNumeric(row[metric]);
                return value !== null;
            });
            
            // Get flagged calls (where metric value is not null and not equal to 1)
            const flaggedCalls = totalCalls.filter(row => {
                const value = this.parseNumeric(row[metric]);
                return value !== null && value !== 1;
            });
            
            // Count flags and totals per agent
            const agentStats = {};
            
            // Count totals
            totalCalls.forEach(row => {
                const agent = row.agent || 'Unknown';
                if (!agentStats[agent]) {
                    agentStats[agent] = { flagCount: 0, total: 0 };
                }
                agentStats[agent].total++;
            });
            
            // Count flags
            flaggedCalls.forEach(row => {
                const agent = row.agent || 'Unknown';
                if (!agentStats[agent]) {
                    agentStats[agent] = { flagCount: 0, total: 0 };
                }
                agentStats[agent].flagCount++;
            });
            
            // Convert to array and sort by flag count descending
            return Object.entries(agentStats)
                .map(([agent, stats]) => ({ agent, flagCount: stats.flagCount, total: stats.total }))
                .sort((a, b) => b.flagCount - a.flagCount);
        },
        getFlaggedCallsForMetric(metric) {
            if (!this.filteredRows || this.filteredRows.length === 0) {
                return [];
            }
            // Metrics that require call_type == 'completed_verification'
            const requiresCompletedVerification = ['correct_inputs', 'confirmed_company', 'call_recorded', 'followed_script'];
            
            return this.filteredRows.filter(row => {
                // Check if metric requires completed_verification
                if (requiresCompletedVerification.includes(metric)) {
                    const callType = (row.call_type || '').trim();
                    if (callType !== 'completed_verification') {
                        return false;
                    }
                }
                
                const value = this.parseNumeric(row[metric]);
                return value !== null && value !== 1;
            });
        },
        toggleVerificationType(type) {
            const index = this.selectedVerificationTypes.indexOf(type);
            if (index > -1) {
                this.selectedVerificationTypes.splice(index, 1);
            } else {
                this.selectedVerificationTypes.push(type);
            }
        },
        selectAllVerificationTypes() {
            this.selectedVerificationTypes = [...this.allVerificationTypes];
        },
        deselectAllVerificationTypes() {
            this.selectedVerificationTypes = [];
        },
        parseNumeric(value) {
            if (value === '' || value === null || value === undefined) {
                return null;
            }
            try {
                return parseFloat(value);
            } catch (e) {
                return null;
            }
        },
        calculateStatisticsFromRows(rows) {
            const agentStats = {};
            const metricColumns = [];
            const excludedMetrics = ['leading_questions', 'user_confused', 'asked_every_question'];
            
            if (rows && rows.length > 0) {
                const excludedCols = ['order_id', 'applicant_name', 'agent', 'verification_type', 'call_type', 
                                      'call_recording_link', 'call_duration'];
                for (const col of Object.keys(rows[0])) {
                    if (!excludedCols.includes(col) && !col.endsWith('_reasoning') && !excludedMetrics.includes(col)) {
                        metricColumns.push(col);
                    }
                }
            }
            
            for (const row of rows) {
                const agent = row.agent || 'Unknown';
                if (!agentStats[agent]) {
                    agentStats[agent] = {
                        total_calls: 0,
                        completed_calls: 0,
                        metrics: {}
                    };
                }
                
                agentStats[agent].total_calls++;
                
                const callType = (row.call_type || '').trim();
                if (callType === 'completed_verification') {
                    agentStats[agent].completed_calls++;
                }
                
                for (const metric of metricColumns) {
                    // For correct_inputs, confirmed_company, call_recorded, and followed_script, only count records where call_type is completed_verification
                    if ((metric === 'correct_inputs' || metric === 'confirmed_company' || metric === 'call_recorded' || metric === 'followed_script') && callType !== 'completed_verification') {
                        continue;
                    }
                    
                    const value = this.parseNumeric(row[metric]);
                    if (value !== null) {
                        if (!agentStats[agent].metrics[metric]) {
                            agentStats[agent].metrics[metric] = {
                                sum: 0,
                                count: 0,
                                values: []
                            };
                        }
                        agentStats[agent].metrics[metric].sum += value;
                        agentStats[agent].metrics[metric].count++;
                        agentStats[agent].metrics[metric].values.push(value);
                    }
                }
            }
            
            // Convert to final format
            const result = {};
            for (const [agent, stats] of Object.entries(agentStats)) {
                const metricsSummary = {};
                for (const [metric, metricData] of Object.entries(stats.metrics)) {
                    if (metricData.count > 0) {
                        // Count flags (values not equal to 1)
                        const flagsCount = metricData.values.filter(v => v !== 1).length;
                        metricsSummary[metric] = {
                            average: Math.round((metricData.sum / metricData.count) * 100) / 100,
                            count: metricData.count,
                            flags: flagsCount,
                            total: stats.total_calls
                        };
                    }
                }
                result[agent] = {
                    total_calls: stats.total_calls,
                    completed_calls: stats.completed_calls,
                    metrics: metricsSummary
                };
            }
            
            return result;
        },
        calculateAggregateStatisticsFromRows(rows, agentStats) {
            const totalCalls = rows.length;
            let completedCalls = 0;
            const allMetrics = {};
            const metricColumns = [];
            const excludedMetrics = ['leading_questions', 'user_confused', 'asked_every_question'];
            
            if (rows && rows.length > 0) {
                const excludedCols = ['order_id', 'applicant_name', 'agent', 'verification_type', 'call_type',
                                      'call_recording_link', 'call_duration'];
                for (const col of Object.keys(rows[0])) {
                    if (!excludedCols.includes(col) && !col.endsWith('_reasoning') && !excludedMetrics.includes(col)) {
                        metricColumns.push(col);
                    }
                }
            }
            
            for (const row of rows) {
                const callType = (row.call_type || '').trim();
                if (callType === 'completed_verification') {
                    completedCalls++;
                }
                
                for (const metric of metricColumns) {
                    // For correct_inputs, confirmed_company, call_recorded, and followed_script, only count records where call_type is completed_verification
                    if ((metric === 'correct_inputs' || metric === 'confirmed_company' || metric === 'call_recorded' || metric === 'followed_script') && callType !== 'completed_verification') {
                        continue;
                    }
                    
                    const value = this.parseNumeric(row[metric]);
                    if (value !== null) {
                        if (!allMetrics[metric]) {
                            allMetrics[metric] = {
                                sum: 0,
                                count: 0,
                                values: []
                            };
                        }
                        allMetrics[metric].sum += value;
                        allMetrics[metric].count++;
                        allMetrics[metric].values.push(value);
                    }
                }
            }
            
            const overallMetrics = {};
            for (const [metric, data] of Object.entries(allMetrics)) {
                if (data.count > 0) {
                    // Count flags (values not equal to 1)
                    const flagsCount = data.values.filter(v => v !== 1).length;
                    overallMetrics[metric] = {
                        average: Math.round((data.sum / data.count) * 100) / 100,
                        count: data.count,
                        flags: flagsCount
                    };
                }
            }
            
            return {
                total_calls: totalCalls,
                completed_calls: completedCalls,
                unique_agents: Object.keys(agentStats).length,
                overall_metrics: overallMetrics
            };
        }
    }
}).mount('#app');

