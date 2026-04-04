export default function ReportsSection() {
  return (
    <div className="px-4 pt-4 pb-20">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Health reports</h2>
      <p className="text-xs text-gray-400 mb-5">Share your progress with your healthcare team</p>

      {/* Monthly — free */}
      <div className="bg-gray-50 rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Monthly progress</span>
          <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">Free</span>
        </div>
        <p className="px-4 text-xs text-gray-400 pb-3">Weight, calories, adherence and hunger summary for the last 30 days.</p>
        <div className="px-4 pb-4 flex gap-2">
          <button
            className="flex-1 bg-gray-900 text-white text-xs font-medium py-2 rounded-xl"
            onClick={() => fetch('/api/exports/healthcare-pdf', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportPeriod: '30days', format: 'standard' }) })}
          >
            Generate PDF
          </button>
        </div>
      </div>

      {/* Clinical — pro */}
      <div className="bg-gray-50 rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Clinical summary</span>
          <span className="text-[10px] bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-medium">Pro</span>
        </div>
        <p className="px-4 text-xs text-gray-400 pb-3">90-day report with side effects, dose history, and AI summary — for your prescriber.</p>
        <div className="px-4 pb-4 flex gap-2">
          <button
            className="flex-1 bg-purple-600 text-white text-xs font-medium py-2 rounded-xl"
            onClick={() => fetch('/api/exports/healthcare-pdf', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportPeriod: '90days', format: 'clinical' }) })}
          >
            Generate PDF
          </button>
          <button className="px-4 bg-white border border-gray-200 text-gray-600 text-xs font-medium py-2 rounded-xl">
            Share
          </button>
        </div>
      </div>

      {/* Data export — pro */}
      <div className="bg-gray-50 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Data export</span>
          <span className="text-[10px] bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-medium">Pro</span>
        </div>
        <p className="px-4 text-xs text-gray-400 pb-3">All logged data as CSV for spreadsheets or other health apps.</p>
        <div className="px-4 pb-4">
          <button className="w-full bg-gray-900 text-white text-xs font-medium py-2 rounded-xl">
            Export CSV
          </button>
        </div>
      </div>
    </div>
  )
}
