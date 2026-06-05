/**
 * Admin dashboard home — displays fleet summary metrics.
 */
export default function AdminDashboard(): JSX.Element {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Fleet Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Drivers', value: '—' },
          { label: 'Rides Today', value: '—' },
          { label: 'Revenue Today', value: '—' },
          { label: 'Avg Wait Time', value: '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
