// Decorative menu icons share the same size, stroke and inherited color.
const paths = {
  "📊": "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  "📅": "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2",
  "📆": "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM7 3v4m10-4v4M3 11h18m-13 5 3 2 5-4",
  "💇": "M8 4h8v4H8ZM8 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2M8 13h8m-8 4h5",
  "🔗": "m10 13 4-4m-5 6-2 2a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0m2 0 2-2a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0",
  "👥": "M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3m12-17a4 4 0 0 1 0 8m4 2a4 4 0 0 1 4 4v3M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  "👤": "M20 21v-3a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v3m8-18a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  "🎁": "M3 8h18v4H3Zm2 4v9h14v-9M12 8v13m0-13H8a3 3 0 1 1 3-3Zm0 0h4a3 3 0 1 0-3-3Z",
  "📣": "M3 10v5h5l12 4V6L8 10Zm5 5 2 6H6l-2-6m16-4h2",
  "🛒": "M2 3h3l3 12h10l3-9H6M9 19a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  "🧾": "M5 3h14v18l-3-2-4 2-4-2-3 2ZM8 7h8m-8 4h8m-8 4h5",
  "📝": "M13 4H5v17h14v-8m-9 1 2-5 7-7 3 3-7 7Z",
  "💵": "M3 6h18v13H3ZM3 10h18m-4 5h1M7 3h10",
  "🏦": "m3 8 9-5 9 5ZM5 10v8m7-8v8m7-8v8M3 21h18",
  "📒": "M5 3h15v18H5ZM2 7h5m-5 5h5m-5 5h5m5-10h6m-6 5h6",
  "⚠️": "m12 3 10 18H2ZM12 9v5m0 3v.1",
  "💰": "M12 3v18m5-14h-7a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H7",
  "📦": "m12 3 9 5v9l-9 5-9-5V8Zm-9 5 9 5 9-5m-9 5v9M7 5l10 6",
  "🧴": "M9 3h6v4H9Zm-1 4h8v3l3 3v8H5v-8l3-3ZM8 15h8",
  "📄": "M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h8",
  "🔧": "M14 4a6 6 0 0 0-7 8l-5 5a3 3 0 0 0 4 4l5-5a6 6 0 0 0 8-7l-4 4-4-4Z",
  "📈": "M3 3v18h18M7 15l5-5 4 3 5-7m-5 0h5v5",
  "📑": "M8 3h12v15H8ZM4 6H2v15h13v-1M11 7h6m-6 4h6",
  "🏆": "M7 3h10v7a5 5 0 0 1-10 0Zm0 2H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 3v6m-4 0h8",
  "🔐": "M5 10h14v11H5Zm3 0V7a4 4 0 0 1 8 0v3m-4 5v2",
  "✂️": "M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 12a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm3-8 12 13M9 17 21 4",
  "✨": "m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3ZM3 2v4M1 4h4",
  "👨‍💻": "M4 3h16v12H4ZM2 19h20M12 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-4 7a4 4 0 0 1 8 0",
  "🏢": "M4 21V3h12v18m0-12h4v12M8 7h1m3 0h1M8 11h1m3 0h1M8 15h1m3 0h1M2 21h20"
};

export default function MenuIcon({ icon }) {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[icon] || paths["📄"]} /></svg>;
}
