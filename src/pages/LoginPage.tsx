import React from 'react'

function LoginPage() {
  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Sign In</h1>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Email Address</label>
          <input type="email" className="w-full border rounded px-3 py-2" placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input type="password" className="w-full border rounded px-3 py-2" placeholder="Enter your password" />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Log In
        </button>
      </form>
    </div>
  )
}

export default LoginPage 