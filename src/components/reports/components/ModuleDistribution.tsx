import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Target as TargetIcon } from 'lucide-react'
import { ListDistItem } from '../types/reports.types'

interface ModuleDistributionProps {
    listDist: ListDistItem[]
}

export function ModuleDistribution({ listDist }: ModuleDistributionProps) {
    return (
        <div className="bg-[#111111] border border-white/[0.05] rounded-3xl p-8 min-h-[400px]">
            {listDist.length > 0 ? (
                <div className="flex flex-col items-center">
                    <div className="w-56 h-56 relative mb-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={listDist}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {listDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <TargetIcon size={32} className="text-white/10" />
                        </div>
                    </div>

                    <div className="w-full space-y-3">
                        {listDist.map((item) => (
                            <div key={item.name} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: item.color }} />
                                    <span className="text-xs font-medium text-white/70">{item.name}</span>
                                </div>
                                <span className="text-xs font-bold text-white font-mono">{item.value}m</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-white/20">
                    <p className="text-xs">No project data available</p>
                </div>
            )}
        </div>
    )
}
