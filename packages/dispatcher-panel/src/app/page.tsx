/**
 * Dispatcher console — live ride queue and driver map.
 */
export default function DispatcherConsole(): JSX.Element {
  return (
    <main className="flex h-screen">
      <aside className="w-80 bg-gray-800 border-r border-gray-700 p-4">
        <h2 className="text-lg font-semibold mb-4">Active Rides</h2>
        <p className="text-gray-400 text-sm">No active rides</p>
      </aside>
      <section className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Map view — connect to tracking WebSocket to display driver locations</p>
      </section>
    </main>
  );
}
