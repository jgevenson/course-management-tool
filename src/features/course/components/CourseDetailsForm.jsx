import { useState, useEffect } from 'react'

/**
 * ## CourseDetailsForm Component
 * 
 * A React functional component for editing and saving the details of a golf course. 
 * It presents a form with fields for the course's name, address, contact information, 
 * and general notes. The component handles both the display of existing course data 
 * and the submission of updates.
 *
 * ### Component Responsibilities
 * - **State Management**: Maintains local state (`courseForm`) for the form inputs, allowing 
 *   for controlled component behavior. It also tracks the `saving` status and any `message` 
 *   to display to the user.
 * - **Data Binding**: Initializes and updates the form state based on the `course` prop 
 *   passed by the parent component.
 * - **User Input Handling**: Captures changes from all form fields (name, address, city, 
 *   region, postal code, country, phone, website, notes) and updates the local state.
 * - **Form Submission**: Triggers the `onSave` callback (provided by the parent) with a 
 *   payload containing the updated course information when the "Save" button is clicked.
 * - **User Feedback**: Displays a status message (e.g., "Saved course details.") after 
 *   a successful save or an error message if the save operation fails.
 * - **Optimistic Updates**: The form updates the UI optimistically and uses a timeout to 
 *   clear messages after a short duration.
 *
 * ### Usage Pattern
 * This component is intended to be used within a page that displays detailed course information. 
 * It relies on the parent component to provide the `course` data and the `onSave` callback 
 * function to handle the actual data persistence logic.
 * 
 * @param {Object} props - The properties for the CourseDetailsForm component.
 * @param {Object|null} props.course - The current course object, containing existing course data.
 * @param {function(Object): Promise<Object>} props.onSave - A callback function that is invoked 
 *   when the form is submitted. It should accept the updated course payload and return a 
 *   promise that resolves to a result object (e.g., `{ success: boolean, error?: string }`).
 * @returns {React.Component} The `CourseDetailsForm` component, rendering the editable course form.
 */
export default function CourseDetailsForm({ course, onSave }) {
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
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (course) {
      setCourseForm({
        name: course.name ?? '',
        address_line: course.address_line ?? '',
        city: course.city ?? '',
        region: course.region ?? '',
        postal_code: course.postal_code ?? '',
        country: course.country ?? '',
        phone: course.phone ?? '',
        website: course.website ?? '',
        notes: course.notes ?? '',
      })
    }
  }, [course])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    const payload = {
      name: courseForm.name.trim() || course.name,
      address_line: courseForm.address_line.trim() || null,
      city: courseForm.city.trim() || null,
      region: courseForm.region.trim() || null,
      postal_code: courseForm.postal_code.trim() || null,
      country: courseForm.country.trim() || null,
      phone: courseForm.phone.trim() || null,
      website: courseForm.website.trim() || null,
      notes: courseForm.notes.trim() || null,
    }
    
    const res = await onSave(payload)
    if (!res.success) {
      setMessage(res.error)
    } else {
      setMessage('Saved course details.')
      window.setTimeout(() => setMessage(null), 2800)
    }
    setSaving(false)
  }

  return (
    <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Course information</h2>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-12">
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
        <div className="md:col-span-5">
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
        <div className="md:col-span-3">
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
        <div className="md:col-span-2">
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
        <div className="md:col-span-2">
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
        {/* <div>
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
        </div> */}
        <div className="md:col-span-3">
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
        <div className="md:col-span-5">
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
        {/* <div className="md:col-span-2">
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
        </div> */}
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save course information'}
      </button>
      {message && (
        <p className={`mt-3 text-sm ${message.startsWith('Saved') ? 'text-emerald-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </section>
  )
}
