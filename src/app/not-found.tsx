// app/not-found.tsx

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white flex-col">
      <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
      <p className="mt-2 text-gray-400">Sorry, the page you're looking for doesn't exist.</p>
    </div>
  );
}
