import { useQuery } from '@tanstack/react-query'
import apiClient from '../../../infrastructure/api/client'
import type { Vehicle } from '../../../domain/types'

export default function VehiclesPage() {
    const { data: vehicles, isLoading } = useQuery({
        queryKey: ['vehicles'],
        queryFn: async () => {
            const { data } = await apiClient.get<Vehicle[]>('/vehicles?limit=100')
            return data
        }
    })

    return (
        <div className="fade-in">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1>Vehicles</h1>
                        <p>All vehicles registered with your workshop</p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="loading-state"><div className="spinner" /><span>Loading vehicles…</span></div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Registry / Plate</th>
                                <th>VIN</th>
                                <th>Make</th>
                                <th>Model</th>
                                <th>Year</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!vehicles || vehicles.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 32 }}>
                                    No vehicles registered yet.
                                </td></tr>
                            ) : vehicles.map(v => (
                                <tr key={v.vin ?? v.registry}>
                                    <td>{v.registry || '—'}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{v.vin || '—'}</td>
                                    <td>{v.make || '—'}</td>
                                    <td>{v.model || '—'}</td>
                                    <td>{v.year || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
