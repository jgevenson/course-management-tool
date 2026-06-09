import { useState } from 'react'
import { useClubs } from '../../../hooks/useClubs'
import BagAddClubForm from './BagAddClubForm'
import BagClubList from './BagClubList'

export default function DigitalBagPanel({ userId, clubs, loading, fetchError, activeClubId, onSelectClub, addClub, updateClub, removeClub }) {
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const displayError = error || fetchError

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <h2 className="text-xl font-semibold text-white mb-1">My bag</h2>
      <p className="text-sm text-slate-500 mb-5">
        Clubs are ordered by <span className="text-slate-400">sort order</span>. Set carry and total (yards); carry
        must be at or below total. Use a short label for quick readouts (e.g. Dr, 7i, PW).
      </p>

      {loading && <p className="text-slate-400 text-sm">Loading clubs…</p>}

      {displayError && (
        <p className="mb-4 text-sm text-red-400" role="alert">
          {displayError}
        </p>
      )}
      {message && <p className="mb-4 text-sm text-emerald-400">{message}</p>}

      {!loading && (
        <>

          <BagClubList
            clubs={clubs}
            activeClubId={activeClubId}
            onSelectClub={onSelectClub}
            onUpdate={updateClub}
            onRemove={removeClub}
            setError={setError}
            setMessage={setMessage}
          />
          <BagAddClubForm
            onAdd={addClub}
            clubs={clubs}
            setError={setError}
            setMessage={setMessage}
          />
        </>
      )}
    </div>
  )
}
