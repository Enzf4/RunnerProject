import { useState, useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'

const IBGE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome'

let cachedCities = null
let fetchPromise = null

async function loadCities() {
  if (cachedCities) return cachedCities
  if (fetchPromise) return fetchPromise

  fetchPromise = fetch(IBGE_URL)
    .then(res => res.json())
    .then(data => {
      cachedCities = data.map(c => ({
        name: c.nome,
        state: c.microrregiao?.mesorregiao?.UF?.sigla || '',
        full: `${c.nome} - ${c.microrregiao?.mesorregiao?.UF?.sigla || ''}`
      }))
      return cachedCities
    })
    .catch(() => {
      fetchPromise = null
      return []
    })

  return fetchPromise
}

export function CitySelect({ value, onChange, placeholder = 'Buscar cidade...', className = '', compact = false }) {
  const [query, setQuery] = useState(value || '')
  const [cities, setCities] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef(null)

  // Sync external value
  useEffect(() => {
    setQuery(value || '')
  }, [value])

  // Load cities on first interaction
  const handleFocus = async () => {
    if (cities.length === 0) {
      setLoading(true)
      const data = await loadCities()
      setCities(data)
      setLoading(false)
      if (query) {
        filterCities(query, data)
      }
    }
    setOpen(true)
  }

  const filterCities = (term, list = cities) => {
    if (!term.trim()) {
      setSuggestions([])
      return
    }
    const lower = term.toLowerCase()
    const matched = list
      .filter(c => c.name.toLowerCase().includes(lower) || c.full.toLowerCase().includes(lower))
      .slice(0, 8)
    setSuggestions(matched)
  }

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setOpen(true)
    filterCities(val)
    // Don't call onChange until a city is selected or user clears
    if (!val) {
      onChange('')
    }
  }

  const handleSelect = (city) => {
    const display = `${city.name} - ${city.state}`
    setQuery(display)
    onChange(display)
    setOpen(false)
    setSuggestions([])
  }

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
        // If user typed something but didn't select, keep the typed value
        if (query && query !== value) {
          onChange(query)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [query, value, onChange])

  const baseInputClass = compact
    ? 'w-full rounded-2xl h-10 text-sm text-center bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:outline-none focus:ring-2 focus:ring-pastel-lavender/50 dark:focus:ring-purple-500/30 transition-all dark:text-zinc-100 px-4'
    : `w-full rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:outline-none focus:ring-2 focus:ring-pastel-lavender/50 dark:focus:ring-purple-500/30 focus:bg-white dark:focus:bg-zinc-900 transition-all dark:text-zinc-100 px-4 text-sm ${className}`

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={baseInputClass}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/50 rounded-2xl shadow-xl dark:shadow-none overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((city, i) => (
            <button
              key={`${city.name}-${city.state}-${i}`}
              type="button"
              onClick={() => handleSelect(city)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 truncate">{city.name}</span>
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 ml-auto">{city.state}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
