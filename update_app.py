import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Make it completely different: Slate & Amber
content = content.replace('bg-teal-', 'bg-slate-')
content = content.replace('text-teal-', 'text-slate-')
content = content.replace('border-teal-', 'border-slate-')
content = content.replace('ring-teal-', 'ring-amber-')
content = content.replace('text-white', 'text-slate-50')
content = content.replace('text-emerald-', 'text-amber-')
content = content.replace('bg-emerald-', 'bg-amber-')
content = content.replace('from-teal-', 'from-slate-')
content = content.replace('to-emerald-', 'to-amber-')
content = content.replace('to-teal-', 'to-slate-')

# Specific adjustments
content = content.replace('text-slate-300', 'text-slate-300') # keep slate for some
content = content.replace("class=\"w-5 h-5 sm:w-6 sm:h-6 text-slate-300\"", "class=\"w-5 h-5 sm:w-6 sm:h-6 text-amber-500\"")
content = content.replace("'text-slate-300', 'hover:bg-slate-900/40'", "'text-slate-400', 'hover:bg-slate-800/60'")
content = content.replace("'bg-slate-600', 'text-slate-50'", "'bg-amber-600', 'text-slate-950'")
content = content.replace('prayer-card-active ring-2 ring-amber-400 bg-slate-900/60', 'prayer-card-active ring-2 ring-amber-400 bg-slate-800/80')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
