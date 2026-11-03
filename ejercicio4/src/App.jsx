import { useState } from 'react';
import Header from './components/Header.jsx';
import MealDetail, { DETAIL_TITLE_ID } from './components/MealDetail.jsx';
import Modal from './components/Modal.jsx';
import RandomMeal from './components/RandomMeal.jsx';
import ResultsSection from './components/ResultsSection.jsx';
import StampList from './components/StampList.jsx';
import { EmptyState } from './components/Status.jsx';
import { useDebouncedValue } from './hooks/useDebouncedValue.js';
import { useAreaMeals, useAreas, useRecipeSearch } from './hooks/useRecipes.js';
import { useStamps } from './hooks/useStamps.js';

/**
 * Componente raíz. Solo guarda el estado que comparten varios hijos
 * (lifting state up) y lo reparte por props:
 *  - area:  el país elegido (lo usan Header, StampList y ResultsSection)
 *  - query: el texto del buscador (lo usan Header y ResultsSection)
 *  - detail: qué hay abierto en la modal: null, { type: 'meal', id } o { type: 'random' }
 * Todo lo demás (nombre del país, modo búsqueda, platos…) se deriva.
 */
export default function App() {
  const [area, setArea] = useState('');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState(null);

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

  // Las tarjetas salen de recetas ya cargadas, así que la receta abierta se
  // busca por id en vez de copiarla al estado (y no hace falta volver a pedirla).
  const loadedMeals = activeRequest.data?.meals ?? [];
  const openMeal = detail?.type === 'meal' ? loadedMeals.find((m) => m.id === detail.id) : null;

  // Cambiar de país es un EVENTO: el reset del buscador va aquí, no en un useEffect.
  function handleAreaChange(nextArea) {
    setArea(nextArea);
    setQuery('');
  }

  const closeDetail = () => setDetail(null);

  return (
    <>
      <Header
        areasRequest={areasRequest}
        area={area}
        onAreaChange={handleAreaChange}
        query={query}
        onQueryChange={setQuery}
        onRandom={() => setDetail({ type: 'random' })}
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
            onOpenMeal={(id) => setDetail({ type: 'meal', id })}
          />
        </section>
      </main>

      <Modal open={detail !== null} onClose={closeDetail} labelledBy={DETAIL_TITLE_ID}>
        {detail?.type === 'random' && <RandomMeal />}
        {detail?.type === 'meal' &&
          (openMeal ? (
            <MealDetail meal={openMeal} />
          ) : (
            <EmptyState>Esta receta ya no está en la lista. Prueba con otra.</EmptyState>
          ))}
      </Modal>

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
