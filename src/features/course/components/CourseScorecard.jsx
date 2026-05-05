import { useMemo } from 'react'
import { getContrastYIQ } from '../../../utils/colors'
/**
 * ## CourseScorecard Component
 * 
 * Displays a traditional 18-hole golf scorecard.
 */
export default function CourseScorecard({ holes = [], tees = [], yardages = [] }) {
  const sortedHoles = useMemo(() => {
    return [...holes].sort((a, b) => a.hole_number - b.hole_number)
  }, [holes])

  const front9 = sortedHoles.filter(h => h.hole_number >= 1 && h.hole_number <= 9)
  const back9 = sortedHoles.filter(h => h.hole_number >= 10 && h.hole_number <= 18)

  // We need a helper to get yardage for a hole/tee
  const getYardage = (holeId, teeId) => {
    const y = yardages.find(y => y.hole_id === holeId && y.tee_id === teeId)
    return y ? y.yardage : null
  }

  const getTeeTotals = (teeId, holesList) => {
    return holesList.reduce((sum, h) => {
      const y = getYardage(h.id, teeId)
      return sum + (Number(y) || 0)
    }, 0)
  }

  const getParTotals = (holesList) => {
    return holesList.reduce((sum, h) => sum + (Number(h.par) || 0), 0)
  }

  if (holes.length === 0 || tees.length === 0) {
    return null
  }

  // Generate 1-9 columns
  const f9Cols = Array.from({ length: 9 }, (_, i) => {
    const hole = front9.find(h => h.hole_number === i + 1)
    return hole || { hole_number: i + 1, placeholder: true }
  })

  const b9Cols = Array.from({ length: 9 }, (_, i) => {
    const hole = back9.find(h => h.hole_number === i + 10)
    return hole || { hole_number: i + 10, placeholder: true }
  })


  return (
    <section className="bg-slate-800 border border-slate-700 rounded-xl p-6 overflow-hidden flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">Course Scorecard</h2>
        <p className="text-sm text-slate-500 mt-1">Traditional view of course yardages, par, and handicaps.</p>
      </div>
      
      <div className="overflow-x-auto -mx-2 px-2 pb-2">
        <table className="min-w-max w-full text-sm border-collapse border border-slate-600 shadow-xl shadow-black/20">
          <thead>
            {/* HOLE ROW */}
            <tr className="bg-slate-700 border-b border-slate-600 text-slate-300">
              <th className="border-r border-slate-600 p-2 text-left font-semibold uppercase"></th>
              <th className="border-r border-slate-600 p-2 font-semibold uppercase"></th>
              
              {f9Cols.map((h, i) => (
                <th key={`f9-h-${i}`} className="border-r border-slate-600 p-2 font-semibold text-center">{h.hole_number}</th>
              ))}
              <th className="border-r border-slate-600 p-2 font-bold text-center bg-slate-600">OUT</th>
              
              {b9Cols.map((h, i) => (
                <th key={`b9-h-${i}`} className="border-r border-slate-600 p-2 font-semibold text-center">{h.hole_number}</th>
              ))}
              <th className="border-r border-slate-600 p-2 font-bold text-center bg-slate-600">IN</th>
              <th className="p-2 font-bold text-center bg-slate-600">TOT</th>
            </tr>
          </thead>
          <tbody>
            {/* TEES */}
            {tees.map(tee => {
              const outYards = getTeeTotals(tee.id, front9)
              const inYards = getTeeTotals(tee.id, back9)
              const totYards = outYards + inYards
              const textColor = getContrastYIQ(tee.color_label)
              
              return (
                <tr key={tee.id} className="border-b border-slate-600 transition-colors">
                  <td 
                    className={`border-r border-slate-600 p-2 font-semibold ${textColor}`} 
                    style={{ backgroundColor: tee.color_label || 'transparent' }}
                  >
                    {tee.name}
                  </td>
                  <td 
                    className={`border-r border-slate-600 p-2 text-center text-xs ${textColor}`}
                    style={{ backgroundColor: tee.color_label || 'transparent' }}
                  >
                    {tee.rating || '-'}/{tee.slope || '-'}
                  </td>
                  
                  {f9Cols.map((h, i) => (
                    <td key={`f9-y-${tee.id}-${i}`} className="border-r border-slate-600 p-2 text-center text-slate-300 bg-slate-800/80">
                      {h.placeholder ? '' : (getYardage(h.id, tee.id) || '-')}
                    </td>
                  ))}
                  <td className="border-r border-slate-600 p-2 text-center font-bold text-slate-200 bg-slate-700/80">{outYards || '-'}</td>
                  
                  {b9Cols.map((h, i) => (
                    <td key={`b9-y-${tee.id}-${i}`} className="border-r border-slate-600 p-2 text-center text-slate-300 bg-slate-800/80">
                      {h.placeholder ? '' : (getYardage(h.id, tee.id) || '-')}
                    </td>
                  ))}
                  <td className="border-r border-slate-600 p-2 text-center font-bold text-slate-200 bg-slate-700/80">{inYards || '-'}</td>
                  <td className="p-2 text-center font-bold text-slate-200 bg-slate-700/80">{totYards || '-'}</td>
                </tr>
              )
            })}

            {/* HANDICAP */}
            <tr className="border-b border-slate-600 bg-slate-800">
              <td className="border-r border-slate-600 p-2 text-left font-semibold text-slate-400 uppercase">hdcp</td>
              <td className="border-r border-slate-600 p-2 text-center text-slate-400"></td>
              
              {f9Cols.map((h, i) => (
                <td key={`f9-hc-${i}`} className="border-r border-slate-600 p-2 text-center text-slate-400 font-medium">
                  {h.placeholder ? '' : (h.stroke_index || '-')}
                </td>
              ))}
              <td className="border-r border-slate-600 p-2 text-center text-slate-400 bg-slate-700"></td>
              
              {b9Cols.map((h, i) => (
                <td key={`b9-hc-${i}`} className="border-r border-slate-600 p-2 text-center text-slate-400 font-medium">
                  {h.placeholder ? '' : (h.stroke_index || '-')}
                </td>
              ))}
              <td className="border-r border-slate-600 p-2 text-center text-slate-400 bg-slate-700"></td>
              <td className="p-2 text-center text-slate-400 bg-slate-700"></td>
            </tr>

            {/* PAR ROW */}
            <tr className="bg-slate-700 text-slate-200 border-t-2 border-t-slate-600">
              <td className="border-r border-slate-600 p-2 text-left font-bold uppercase">Par</td>
              <td className="border-r border-slate-600 p-2 text-center"></td>
              
              {f9Cols.map((h, i) => (
                <td key={`f9-p-${i}`} className="border-r border-slate-600 p-2 text-center font-bold text-emerald-400">
                  {h.placeholder ? '' : (h.par || '-')}
                </td>
              ))}
              <td className="border-r border-slate-600 p-2 text-center font-bold bg-slate-600 text-emerald-400">{getParTotals(front9) || '-'}</td>
              
              {b9Cols.map((h, i) => (
                <td key={`b9-p-${i}`} className="border-r border-slate-600 p-2 text-center font-bold text-emerald-400">
                  {h.placeholder ? '' : (h.par || '-')}
                </td>
              ))}
              <td className="border-r border-slate-600 p-2 text-center font-bold bg-slate-600 text-emerald-400">{getParTotals(back9) || '-'}</td>
              <td className="p-2 text-center font-bold bg-slate-600 text-emerald-400">{getParTotals(sortedHoles) || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
