import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchDaysPlayedComparison } from '../api/client';
import LoadingSpinner from './LoadingSpinner';

const DaysPlayedChart = () => {
    const [daysPlayedData, setDaysPlayedData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const data = await fetchDaysPlayedComparison();
                setDaysPlayedData(data);
            } catch (error) {
                console.error('Error loading days played data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Prepare chart data (top 30 by days played)
    const chartData = daysPlayedData.map(player => ({
        name: player.player_name.length > 10 ? player.player_name.substring(0, 10) + '...' : player.player_name,
        days: player.days_played
    }));

    if (loading) {
        return <LoadingSpinner />;
    }

    if (daysPlayedData.length === 0) {
        return null;
    }

    return (
        <div className="attendance-section" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '2rem',
            marginTop: '2rem',
            marginBottom: '2rem'
        }}>
            <h2 className="section-title" style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                marginBottom: '1.5rem'
            }}>Days Played Comparison</h2>
            <div className="chart-container" style={{
                // background: 'var(--bg-secondary)',
                borderRadius: '12px',
                padding: '1.5rem'
            }}>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                        />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px'
                            }}
                        />
                        <Legend />
                        <Bar
                            dataKey="days"
                            fill="#38bdf8"
                            name="Days Played"
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DaysPlayedChart;
