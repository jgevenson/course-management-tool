// AI assisted development
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Map, MapPin, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../supabaseClient'

function yardKey(holeId, teeId) {
  return `${holeId}:${teeId}`
}

export default function CourseDetails() {
  const { id: courseId } = useParams()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [course, setCourse] = useState(null)
  const [tees, setTees] = useState([])
  const [holes, setHoles] = useState([])

  /** @type {[Record<string, string>, Function]} */
  const [yardageDraft, setYardageDraft] = useState({})

  const [courseSaving, setCourseSaving] = useState(false)
  const [courseMessage, setCourseMessage] = useState(null)

  const [newTee, setNewTee] = useState({ name: '', color_label: '', rating: '', slope: '' })
  const [teeBusy, setTeeBusy] = useState(false)
  const [teeMessage, setTeeMessage] = useState(null)

  const [matrixSaving, setMatrixSaving] = useState(false)
  const [matrixMessage, setMatrixMessage] = useState(null)

  const [courseForm, setCourseForm] = useState({
    name: '',
    address_line: '',
    city: '',
    region: '',
    postal_code: '',
    country: '',
    phone: '',
    website: '',
    notes: '',
  })

  const loadData = useCallback(async () => {
    if (!courseId) return
    setLoading(true)
    setLoadError(null)

    const { data: row, error: courseErr } = await supabase
      .from('courses')
      .select(
        'id, user_id, name, address_line, city, region, postal_code, country, phone, website, notes, course_lat, course_lng, is_active',
      )
      .eq('id', courseId)
      .eq('is_active', true)
      .maybeSingle()

    if (courseErr) {
      setLoadError(courseErr.message)
      setCourse(null)
      setLoading(false)
      return
    }

    if (!row) {
      setLoadError(null)
      setCourse(null)
      setLoading(false)
      return
    }

    setCourse(row)
    setCourseForm({
      name: row.name ?? '',
      address_line: row.address_line ?? '',
      city: row.city ?? '',
      region: row.region ?? '',
      postal_code: row.postal_code ?? '',
      country: row.country ?? '',
      phone: row.phone ?? '',
      website: row.website ?? '',
      notes: row.notes ?? '',
    })

    const { data: teeRows, error: teesErr } = await supabase
      .from('course_tees')
      .select('id, course_id, name, color_label, sort_order, rating, slope, is_default, is_active')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (teesErr) {
      setLoadError(teesErr.message)
      setLoading(false)
      return
    }

    const activeTees = teeRows ?? []
    setTees(activeTees)

    const { data: holeRows, error: holesErr } = await supabase
      .from('holes')
      .select('id, hole_number, course_id')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('hole_number', { ascending: true })

    if (holesErr) {
      setLoadError(holesErr.message)
      setLoading(false)
      return
    }

    const holeList = holeRows ?? []
    setHoles(holeList)

    const teeIds = activeTees.map((t) => t.id)
    let yardMap = {}
    if (teeIds.length > 0) {
      const { data: yardRows, error: yErr } = await supabase
        .from('hole_tee_yardages')
        .select('id, hole_id, tee_id, yardage, is_active')
        .in('tee_id', teeIds)
        .eq('is_active', true)

      if (yErr) {
        setLoadError(yErr.message)
        setLoading(false)
        return
      }

      for (const y of yardRows ?? []) {
        const k = yardKey(y.hole_id, y.tee_id)
        yardMap[k] = y.yardage == null ? '' : String(y.yardage)
      }
    }

    for (const h of holeList) {
      for (const t of activeTees) {
        const k = yardKey(h.id, t.id)
        if (yardMap[k] === undefined) yardMap[k] = ''
      }
    }

    setYardageDraft(yardMap)
    setLoading(false)
  }, [courseId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const saveCourseFields = useCallback(async () => {
    if (!course?.id) return
    setCourseSaving(true)
    setCourseMessage(null)
    const { error } = await supabase
      .from('courses')
      .update({
        name: courseForm.name.trim() || course.name,
        address_line: courseForm.address_line.trim() || null,
        city: courseForm.city.trim() || null,
        region: courseForm.region.trim() || null,
        postal_code: courseForm.postal_code.trim() || null,
        country: courseForm.country.trim() || null,
        phone: courseForm.phone.trim() || null,
        website: courseForm.website.trim() || null,
        notes: courseForm.notes.trim() || null,
      })
      .eq('id', course.id)
      .eq('is_active', true)

    if (error) {
      setCourseMessage(error.message)
    } else {
      setCourseMessage('Saved course details.')
      setCourse((c) =>
        c
          ? {
              ...c,
              name: courseForm.name.trim() || c.name,
              address_line: courseForm.address_line.trim() || null,
              city: courseForm.city.trim() || null,
              region: courseForm.region.trim() || null,
              postal_code: courseForm.postal_code.trim() || null,
              country: courseForm.country.trim() || null,
              phone: courseForm.phone.trim() || null,
              website: courseForm.website.trim() || null,
              notes: courseForm.notes.trim() || null,
            }
          : c,
      )
      window.setTimeout(() => setCourseMessage(null), 2800)
    }
    setCourseSaving(false)
  }, [course, courseForm])

  const addTee = useCallback(async () => {
    if (!courseId || !course) return
    const name = newTee.name.trim()
    if (!name) {
      setTeeMessage('Enter a tee name (e.g. Championship, White).')
      return
    }

    setTeeBusy(true)
    setTeeMessage(null)

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user?.id) {
      setTeeMessage(userErr?.message || 'Not signed in.')
      setTeeBusy(false)
      return
    }

    const sortOrder =
      tees.length === 0 ? 0 : Math.max(...tees.map((t) => t.sort_order ?? 0), 0) + 1
    const isFirst = tees.length === 0

    const ratingVal = newTee.rating.trim()
    const slopeVal = newTee.slope.trim()

    const { error } = await supabase.from('course_tees').insert({
      course_id: courseId,
      user_id: userData.user.id,
      name,
      color_label: newTee.color_label.trim() || null,
      sort_order: sortOrder,
      rating: ratingVal === '' ? null : Number(ratingVal),
      slope: slopeVal === '' ? null : Number(slopeVal),
      is_default: isFirst,
      is_active: true,
    })

    if (error) {
      setTeeMessage(error.message)
    } else {
      setNewTee({ name: '', color_label: '', rating: '', slope: '' })
      await loadData()
    }
    setTeeBusy(false)
  }, [courseId, course, newTee, tees.length, loadData])

  const updateTeeField = useCallback(async (teeId, patch) => {
    setTeeBusy(true)
    setTeeMessage(null)
    const { error } = await supabase.from('course_tees').update(patch).eq('id', teeId).eq('is_active', true)

    if (error) setTeeMessage(error.message)
    else await loadData()
    setTeeBusy(false)
  }, [loadData])

  const removeTee = useCallback(
    async (teeId) => {
      if (!window.confirm('Remove this tee set? Yardages for this tee will be hidden.')) return
      setTeeBusy(true)
      setTeeMessage(null)

      await supabase.from('hole_tee_yardages').update({ is_active: false }).eq('tee_id', teeId)

      const { error } = await supabase.from('course_tees').update({ is_default: false, is_active: false }).eq('id', teeId)

      if (error) {
        setTeeMessage(error.message)
        setTeeBusy(false)
        return
      }

      const { data: remaining } = await supabase
        .from('course_tees')
        .select('id, is_default')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (remaining?.length && !remaining.some((r) => r.is_default)) {
        await supabase.from('course_tees').update({ is_default: true }).eq('id', remaining[0].id)
      }

      await loadData()
      setTeeBusy(false)
    },
    [courseId, loadData],
  )

  const setDefaultTee = useCallback(
    async (teeId) => {
      if (!courseId) return
      setTeeBusy(true)
      setTeeMessage(null)

      await supabase.from('course_tees').update({ is_default: false }).eq('course_id', courseId).eq('is_active', true)

      const { error } = await supabase.from('course_tees').update({ is_default: true }).eq('id', teeId)

      if (error) setTeeMessage(error.message)
      else await loadData()
      setTeeBusy(false)
    },
    [courseId, loadData],
  )

  const saveYardageMatrix = useCallback(async () => {
    if (!courseId || tees.length === 0 || holes.length === 0) return
    setMatrixSaving(true)
    setMatrixMessage(null)

    try {
      for (const h of holes) {
        for (const t of tees) {
          const k = yardKey(h.id, t.id)
          const raw = yardageDraft[k]
          const yardage = raw === '' || raw === undefined ? null : Number(raw)
          if (yardage !== null && (Number.isNaN(yardage) || yardage < 0)) {
            setMatrixMessage(`Invalid yardage for hole ${h.hole_number} (${t.name}).`)
            setMatrixSaving(false)
            return
          }

          const { data: existing } = await supabase
            .from('hole_tee_yardages')
            .select('id')
            .eq('hole_id', h.id)
            .eq('tee_id', t.id)
            .eq('is_active', true)
            .maybeSingle()

          if (existing?.id) {
            const { error } = await supabase
              .from('hole_tee_yardages')
              .update({ yardage })
              .eq('id', existing.id)
            if (error) {
              setMatrixMessage(error.message)
              setMatrixSaving(false)
              return
            }
          } else if (yardage !== null) {
            const { error } = await supabase.from('hole_tee_yardages').insert({
              hole_id: h.id,
              tee_id: t.id,
              yardage,
              is_active: true,
            })
            if (error) {
              setMatrixMessage(error.message)
              setMatrixSaving(false)
              return
            }
          }
        }
      }

      const defaultTee = tees.find((t) => t.is_default)
      if (defaultTee) {
        for (const h of holes) {
          const k = yardKey(h.id, defaultTee.id)
          const raw = yardageDraft[k]
          const y = raw === '' || raw === undefined ? null : Number(raw)
          await supabase.from('holes').update({ scorecard_yardage: y }).eq('id', h.id).eq('is_active', true)
        }
      }

      setMatrixMessage('Scorecard distances saved.')
      window.setTimeout(() => setMatrixMessage(null), 2800)
    } finally {
      setMatrixSaving(false)
    }
  }, [courseId, tees, holes, yardageDraft])

  const setYardCell = useCallback((holeId, teeId, value) => {
    const k = yardKey(holeId, teeId)
    setYardageDraft((prev) => ({ ...prev, [k]: value }))
  }, [])

  const formattedAddress = useMemo(() => {
    const parts = [
      courseForm.address_line,
      [courseForm.city, courseForm.region].filter(Boolean).join(', '),
      courseForm.postal_code,
      courseForm.country,
    ].filter(Boolean)
    return parts.join(' · ')
  }, [courseForm])

  if (!courseId) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-slate-400">
        <p>Missing course id.</p>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-slate-400">
        <p>Loading course…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <p className="text-red-400">{loadError}</p>
        <p className="text-slate-500 text-sm mt-2">
          If this mentions a missing column or table, apply the Supabase migration in{' '}
          <code className="text-slate-300">supabase/migrations/</code>.
        </p>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-slate-400">
        <p>Course not found or you do not have access.</p>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{course.name}</h1>
          {formattedAddress && (
            <p className="text-slate-400 text-sm mt-2 flex items-start gap-2">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500/80" aria-hidden />
              <span>{formattedAddress}</span>
            </p>
          )}
        </div>
        <Link
          to={`/course/${course.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-all duration-200 shadow-lg shadow-emerald-900/20"
        >
          <Map className="w-5 h-5" aria-hidden />
          Open map
        </Link>
      </div>

      <div className="space-y-8">
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Course information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="cd-name" className="block text-sm font-medium text-slate-400 mb-1">
                Course name
              </label>
              <input
                id="cd-name"
                type="text"
                value={courseForm.name}
                onChange={(e) => setCourseForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="cd-address" className="block text-sm font-medium text-slate-400 mb-1">
                Address
              </label>
              <input
                id="cd-address"
                type="text"
                value={courseForm.address_line}
                onChange={(e) => setCourseForm((f) => ({ ...f, address_line: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="cd-city" className="block text-sm font-medium text-slate-400 mb-1">
                City
              </label>
              <input
                id="cd-city"
                type="text"
                value={courseForm.city}
                onChange={(e) => setCourseForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="cd-region" className="block text-sm font-medium text-slate-400 mb-1">
                State / region
              </label>
              <input
                id="cd-region"
                type="text"
                value={courseForm.region}
                onChange={(e) => setCourseForm((f) => ({ ...f, region: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="cd-postal" className="block text-sm font-medium text-slate-400 mb-1">
                Postal code
              </label>
              <input
                id="cd-postal"
                type="text"
                value={courseForm.postal_code}
                onChange={(e) => setCourseForm((f) => ({ ...f, postal_code: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="cd-country" className="block text-sm font-medium text-slate-400 mb-1">
                Country
              </label>
              <input
                id="cd-country"
                type="text"
                value={courseForm.country}
                onChange={(e) => setCourseForm((f) => ({ ...f, country: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="cd-phone" className="block text-sm font-medium text-slate-400 mb-1">
                Phone
              </label>
              <input
                id="cd-phone"
                type="tel"
                value={courseForm.phone}
                onChange={(e) => setCourseForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="cd-web" className="block text-sm font-medium text-slate-400 mb-1">
                Website
              </label>
              <input
                id="cd-web"
                type="url"
                placeholder="https://"
                value={courseForm.website}
                onChange={(e) => setCourseForm((f) => ({ ...f, website: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="cd-notes" className="block text-sm font-medium text-slate-400 mb-1">
                Notes
              </label>
              <textarea
                id="cd-notes"
                rows={3}
                value={courseForm.notes}
                onChange={(e) => setCourseForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y min-h-[80px]"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={saveCourseFields}
            disabled={courseSaving}
            className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {courseSaving ? 'Saving…' : 'Save course information'}
          </button>
          {courseMessage && (
            <p className={`mt-3 text-sm ${courseMessage.startsWith('Saved') ? 'text-emerald-400' : 'text-red-400'}`}>
              {courseMessage}
            </p>
          )}
        </section>

        <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Tee sets</h2>
          <p className="text-sm text-slate-500 mb-4">
            Add tee colors or names, USGA-style course rating and slope. Mark one tee as default; its yardages sync to the
            map &ldquo;scorecard yardage&rdquo; field.
          </p>

          {tees.length > 0 && (
            <ul className="space-y-4 mb-6">
              {tees.map((tee) => (
                <li
                  key={tee.id}
                  className="rounded-lg border border-slate-600 bg-slate-900/50 p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-end"
                >
                  <div className="lg:col-span-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                    <input
                      type="text"
                      defaultValue={tee.name}
                      key={`name-${tee.id}-${tee.name}`}
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        if (v && v !== tee.name) updateTeeField(tee.id, { name: v })
                      }}
                      disabled={teeBusy}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Color / label</label>
                    <input
                      type="text"
                      defaultValue={tee.color_label ?? ''}
                      key={`color-${tee.id}-${tee.color_label ?? ''}`}
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        const next = v || null
                        if (next !== (tee.color_label ?? null)) updateTeeField(tee.id, { color_label: next })
                      }}
                      disabled={teeBusy}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Rating</label>
                    <input
                      type="number"
                      step="0.1"
                      defaultValue={tee.rating ?? ''}
                      key={`rating-${tee.id}-${tee.rating ?? ''}`}
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        const n = v === '' ? null : Number(v)
                        if (n !== tee.rating) updateTeeField(tee.id, { rating: n })
                      }}
                      disabled={teeBusy}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Slope</label>
                    <input
                      type="number"
                      step="1"
                      defaultValue={tee.slope ?? ''}
                      key={`slope-${tee.id}-${tee.slope ?? ''}`}
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        const n = v === '' ? null : Number(v)
                        if (n !== tee.slope) updateTeeField(tee.id, { slope: n })
                      }}
                      disabled={teeBusy}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div className="lg:col-span-2 flex items-center gap-3 pb-2">
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="default-tee"
                        checked={tee.is_default}
                        onChange={() => {
                          if (!tee.is_default) void setDefaultTee(tee.id)
                        }}
                        disabled={teeBusy}
                        className="rounded-full border-slate-500 text-emerald-500 focus:ring-emerald-500"
                      />
                      Default
                    </label>
                  </div>
                  <div className="lg:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeTee(tee.id)}
                      disabled={teeBusy}
                      className="p-2 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/40 disabled:opacity-45"
                      title="Remove tee"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-lg border border-emerald-500/30 bg-slate-900/80 p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label htmlFor="new-tee-name" className="block text-xs font-medium text-slate-500 mb-1">
                New tee name
              </label>
              <input
                id="new-tee-name"
                type="text"
                placeholder="e.g. White, Blue, Tips"
                value={newTee.name}
                onChange={(e) => setNewTee((t) => ({ ...t, name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label htmlFor="new-tee-color" className="block text-xs font-medium text-slate-500 mb-1">
                Color label
              </label>
              <input
                id="new-tee-color"
                type="text"
                placeholder="Optional"
                value={newTee.color_label}
                onChange={(e) => setNewTee((t) => ({ ...t, color_label: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="new-tee-rating" className="block text-xs font-medium text-slate-500 mb-1">
                Rating
              </label>
              <input
                id="new-tee-rating"
                type="number"
                step="0.1"
                value={newTee.rating}
                onChange={(e) => setNewTee((t) => ({ ...t, rating: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="new-tee-slope" className="block text-xs font-medium text-slate-500 mb-1">
                Slope
              </label>
              <input
                id="new-tee-slope"
                type="number"
                step="1"
                value={newTee.slope}
                onChange={(e) => setNewTee((t) => ({ ...t, slope: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
              />
            </div>
            <div className="md:col-span-1 flex justify-end">
              <button
                type="button"
                onClick={addTee}
                disabled={teeBusy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" aria-hidden />
                Add
              </button>
            </div>
          </div>
          {teeMessage && <p className="mt-3 text-sm text-red-400">{teeMessage}</p>}
        </section>

        <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Scorecard distances (yards)</h2>
              <p className="text-sm text-slate-500 mt-1">Per hole, for each tee. Save when finished editing.</p>
            </div>
            <button
              type="button"
              onClick={saveYardageMatrix}
              disabled={matrixSaving || tees.length === 0 || holes.length === 0}
              className="shrink-0 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-45"
            >
              {matrixSaving ? 'Saving…' : 'Save scorecard distances'}
            </button>
          </div>

          {tees.length === 0 || holes.length === 0 ? (
            <p className="text-slate-500 text-sm">
              {holes.length === 0
                ? 'This course has no holes yet. Add holes in your database or legacy import, then enter yardages here.'
                : 'Add at least one tee set above to fill in yardages.'}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="sticky left-0 z-10 bg-slate-800 text-left py-3 pr-4 pl-2 text-slate-400 font-medium">Hole</th>
                    {tees.map((t) => (
                      <th key={t.id} className="py-3 px-2 text-slate-300 font-semibold whitespace-nowrap min-w-[88px]">
                        <span>{t.name}</span>
                        {t.color_label && <span className="block text-xs font-normal text-slate-500">{t.color_label}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holes.map((h) => (
                    <tr key={h.id} className="border-b border-slate-700/80">
                      <td className="sticky left-0 z-10 bg-slate-800 py-2 pr-4 pl-2 text-white font-medium">
                        {h.hole_number}
                      </td>
                      {tees.map((t) => {
                        const k = yardKey(h.id, t.id)
                        return (
                          <td key={t.id} className="py-1.5 px-1">
                            <input
                              type="number"
                              min={0}
                              max={900}
                              placeholder="—"
                              value={yardageDraft[k] ?? ''}
                              onChange={(e) => setYardCell(h.id, t.id, e.target.value)}
                              className="w-full min-w-[72px] px-2 py-1.5 bg-slate-900 border border-slate-600 rounded-md text-white text-center"
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {matrixMessage && (
            <p
              className={`mt-4 text-sm ${matrixMessage.toLowerCase().includes('saved') ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {matrixMessage}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
