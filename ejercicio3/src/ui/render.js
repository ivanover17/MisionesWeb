/**
 * Capa de presentación: recibe datos ya transformados y los pinta.
 * Todo texto que viene de la API pasa por escapeHTML antes de entrar en el DOM.
 */

const escapeHTML = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

/** Iniciales para el sello: "United Kingdom" -> "UK", "Spain" -> "SP". */
const initials = (text) => {
  const words = text.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((w) => w[0]).join('') : text.slice(0, 2))
    .slice(0, 3)
    .toUpperCase();
};

const FALLBACK_IMAGE = '/plate.svg';

/** TheMealDB sirve miniaturas añadiendo /preview a la URL de la imagen. */
const thumbnail = (url) => (url.startsWith('http') ? `${url}/preview` : url);

/** Si una imagen falla (404, sin red…) se cambia por el plato vacío. */
function useImageFallback(container) {
  container.querySelectorAll('img').forEach((img) =>
    img.addEventListener('error', () => (img.src = FALLBACK_IMAGE), { once: true }),
  );
}

/* ---------- Estados genéricos ---------- */

export function renderLoading(container, message = 'Preparando los fogones…') {
  container.innerHTML = `
    <div class="status status--loading" role="status" aria-live="polite">
      <div class="pot" aria-hidden="true"><span></span><span></span><span></span></div>
      <p>${escapeHTML(message)}</p>
    </div>`;
}

export function renderError(container, message, onRetry) {
  container.innerHTML = `
    <div class="status status--error" role="alert">
      <p class="status__icon" aria-hidden="true">🔥</p>
      <p><strong>Se nos ha quemado la receta.</strong></p>
      <p>${escapeHTML(message)}</p>
      ${onRetry ? '<button type="button" class="btn" data-retry>Reintentar</button>' : ''}
    </div>`;
  container.querySelector('[data-retry]')?.addEventListener('click', onRetry, { once: true });
}

export function renderEmpty(container, message) {
  container.innerHTML = `
    <div class="status status--empty">
      <p class="status__icon" aria-hidden="true">🍽️</p>
      <p>${escapeHTML(message)}</p>
    </div>`;
}

/* ---------- Selector de países ---------- */

export function renderAreaOptions(select, areas) {
  select.innerHTML = [
    '<option value="">Elige un destino…</option>',
    ...areas.map(
      ({ area, country }) =>
        `<option value="${escapeHTML(area)}">${escapeHTML(country)} · ${escapeHTML(area)}</option>`,
    ),
  ].join('');
  select.disabled = areas.length === 0;
}

/* ---------- Sellos visitados ---------- */

export function renderStamps(container, stamps) {
  container.innerHTML = stamps.length
    ? stamps
        .map(
          ({ area, country }, i) => `
          <button type="button" class="stamp" data-area="${escapeHTML(area)}"
                  style="--tilt:${((i * 37) % 17) - 8}deg" title="Volver a ${escapeHTML(country)}">
            <span class="stamp__code">${escapeHTML(initials(country))}</span>
            <span class="stamp__name">${escapeHTML(country)}</span>
          </button>`,
        )
        .join('')
    : '<p class="stamps__empty">Aún no tienes sellos. ¡Elige tu primer destino!</p>';
}

/* ---------- Cabecera del país + estadísticas ---------- */

export function renderCountryHeader(container, { country, stats, totalAvailable, failed }) {
  if (!country) {
    container.innerHTML = '';
    return;
  }

  const notes = [
    totalAvailable > stats.total + failed &&
      `Mostrando ${stats.total + failed} de ${totalAvailable} platos.`,
    failed > 0 && `${failed} receta(s) no se pudieron cargar.`,
  ].filter(Boolean);

  container.innerHTML = `
    <div class="country">
      <div class="country__seal" aria-hidden="true">${escapeHTML(initials(country))}</div>
      <div>
        <h2 class="country__title">${escapeHTML(country)}</h2>
        <ul class="facts">
          <li><strong>${stats.total}</strong> platos</li>
          <li><strong>${stats.avgIngredients}</strong> ingredientes de media</li>
          ${
            stats.topIngredient
              ? `<li>Ingrediente estrella: <strong>${escapeHTML(stats.topIngredient.name)}</strong>
                 (${stats.topIngredient.count})</li>`
              : ''
          }
        </ul>
        ${notes.map((n) => `<p class="country__note">${escapeHTML(n)}</p>`).join('')}
      </div>
    </div>`;
}

export function renderCategoryChips(container, categories, active) {
  const total = categories.reduce((sum, [, count]) => sum + count, 0);
  const chips = [['all', total], ...categories];

  container.innerHTML = categories.length
    ? chips
        .map(
          ([name, count]) => `
          <button type="button" class="chip ${name === active ? 'chip--active' : ''}"
                  data-category="${escapeHTML(name)}" aria-pressed="${name === active}">
            ${name === 'all' ? 'Todo' : escapeHTML(name)} <span>${count}</span>
          </button>`,
        )
        .join('')
    : '';
}

/* ---------- Tarjetas ---------- */

export function renderMealCards(container, meals) {
  container.innerHTML = `
    <ul class="grid">
      ${meals
        .map(
          (meal) => `
          <li>
            <button type="button" class="card" data-meal-id="${escapeHTML(meal.id)}">
              <img src="${escapeHTML(thumbnail(meal.image))}" alt="" loading="lazy" />
              <span class="card__tag">${escapeHTML(meal.category)}</span>
              <span class="card__name">${escapeHTML(meal.name)}</span>
              <span class="card__meta">${meal.ingredients.length} ingredientes</span>
            </button>
          </li>`,
        )
        .join('')}
    </ul>`;
  useImageFallback(container);
}

/* ---------- Detalle (modal) ---------- */

export function renderMealDetail(container, meal) {
  const links = [
    meal.youtube && `<a class="btn" href="${escapeHTML(meal.youtube)}" target="_blank" rel="noopener">▶ Ver vídeo</a>`,
    meal.source && `<a class="btn btn--ghost" href="${escapeHTML(meal.source)}" target="_blank" rel="noopener">Receta original</a>`,
  ].filter(Boolean);

  container.innerHTML = `
    <article class="detail">
      <img class="detail__img" src="${escapeHTML(meal.image)}" alt="${escapeHTML(meal.name)}" />
      <div class="detail__body">
        <p class="detail__kicker">${escapeHTML(meal.country)} · ${escapeHTML(meal.category)}</p>
        <h2 id="detail-title">${escapeHTML(meal.name)}</h2>
        ${
          meal.tags.length
            ? `<p class="tags">${meal.tags.map((t) => `<span>#${escapeHTML(t)}</span>`).join(' ')}</p>`
            : ''
        }
        <h3>Ingredientes</h3>
        ${
          meal.ingredients.length
            ? `<ul class="ingredients">${meal.ingredients
                .map(
                  ({ name, measure }) =>
                    `<li><span>${escapeHTML(name)}</span><em>${escapeHTML(measure || 'al gusto')}</em></li>`,
                )
                .join('')}</ul>`
            : '<p>Esta receta no indica ingredientes.</p>'
        }
        <h3>Preparación</h3>
        ${
          meal.steps.length
            ? `<ol class="steps">${meal.steps.map((s) => `<li>${escapeHTML(s)}</li>`).join('')}</ol>`
            : '<p>Sin instrucciones. Toca improvisar 👨‍🍳</p>'
        }
        ${links.length ? `<p class="links">${links.join('')}</p>` : ''}
      </div>
    </article>`;
  useImageFallback(container);
}
