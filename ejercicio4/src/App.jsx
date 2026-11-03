import { useState } from 'react';
import Header from './components/Header.jsx';
import ResultsSection from './components/ResultsSection.jsx';
import StampList from './components/StampList.jsx';
import { useDebouncedValue } from './hooks/useDebouncedValue.js';
import { useAreaMeals, useAreas, useRecipeSearch } from './hooks/useRecipes.js';
import { useStamps } from './hooks/useStamps.js';

/**
 * Componente raíz. Solo guarda el estado que comparten varios hijos
 * (lifting state up) y lo reparte por props:
 *  - area:  el país elegido (lo usan Header, StampList y ResultsSection)
 *  - query: el texto del buscador (lo usan Header y ResultsSection)
 * Todo lo demás (nombre del país, modo búsqueda, platos…) se deriva.
 */
export default function App() {
  const [area, setArea] = useState('');
  const [query, setQuery] = useState('');

  const { stamps, addStamp } = useStamps();
  const areasRequest = useAreas();

  // Con país elegido, el buscador filtra lo ya cargado; sin país, busca en la API.
  // Al escribir se espera 400 ms, pero al borrar el texto se limpia al momento.
  const debouncedQuery = useDebouncedValue(query, 400);
  const searchTerm = query.trim() ? debouncedQuery.trim() : '';
  const areaRequest = useAreaMeals(area, addStamp);
  const searchRequest = useRecipeSearch(area ? '' : searchTerm);
  const activeRequest = area ? areaRequest : searchRequest;

  const country = area ? findCountryName(area, areasRequest.data, stamps) : '';

  // Cambiar de país es un EVENTO: el reset del buscador va aquí, no en un useEffect.
  function handleAreaChange(nextArea) {
    setArea(nextArea);
    setQuery('');
  }

  function handleOpenMeal(id) {
    console.info('Abrir receta', id);
  }

  return (
    <>
      <Header
        areasRequest={areasRequest}
        area={area}
        onAreaChange={handleAreaChange}
        query={query}
        onQueryChange={setQuery}
        onRandom={() => console.info('Receta al azar')}
      />

      <main className="page">
        <StampList stamps={stamps} activeArea={area} onSelect={handleAreaChange} />

        <section aria-label="Platos" className="results">
          <ResultsSection
            key={area || `search:${searchTerm}`}
            request={activeRequest}
            country={country}
            searchTerm={searchTerm}
            filterQuery={area ? query : ''}
            onOpenMeal={handleOpenMeal}
          />
        </section>
      </main>

      <footer className="footer">
        Datos de{' '}
        <a href="https://www.themealdb.com" target="_blank" rel="noreferrer">
          TheMealDB
        </a>{' '}
        · Proyecto académico con React 19 y Vite
      </footer>
    </>
  );
}

/** Nombre "bonito" del país: de la lista de países o, si aún no ha cargado, de los sellos. */
function findCountryName(area, areas, stamps) {
  return (
    areas?.find((a) => a.area === area)?.country ??
    stamps.find((s) => s.area === area)?.country ??
    area
  );
}
